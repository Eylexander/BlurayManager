package api

import (
	"encoding/csv"
	"eylexander/bluraymanager/models"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
)

// utf8BOM is prepended to exports so spreadsheet apps (Excel in particular)
// detect the encoding instead of mangling accented characters.
const utf8BOM = "\xEF\xBB\xBF"

// csvHeader is the column layout shared by export and import. Import reads
// columns by position, so the order here is part of the file format.
var csvHeader = []string{
	"Title", "Type", "GenreEn", "GenreFr", "DescriptionEn", "DescriptionFr", "Director",
	"ReleaseYear", "Runtime", "Rating", "PurchasePrice", "PurchaseDate",
	"CoverImageURL", "BackdropURL", "TMDBID", "Tags", "Seasons", "TotalEpisodes",
}

const csvDateLayout = "2006-01-02"

// defaultTagColor is used for tags created while importing a CSV.
const defaultTagColor = "#3B82F6"

// writeBluraysCSV serializes blurays into the export format.
func writeBluraysCSV(w io.Writer, blurays []*models.Bluray) error {
	if _, err := io.WriteString(w, utf8BOM); err != nil {
		return err
	}

	cw := csv.NewWriter(w)
	if err := cw.Write(csvHeader); err != nil {
		return err
	}
	for _, b := range blurays {
		if err := cw.Write(blurayToRecord(b)); err != nil {
			return err
		}
	}
	cw.Flush()
	return cw.Error()
}

// readBluraysCSV parses an import file into records, header row excluded.
func readBluraysCSV(r io.Reader) ([][]string, error) {
	cr := csv.NewReader(r)
	cr.FieldsPerRecord = -1 // short rows are reported per line by the caller
	cr.LazyQuotes = true

	records, err := cr.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(records) < 2 {
		return nil, fmt.Errorf("CSV file is empty or invalid")
	}

	// A BOM would otherwise end up glued to the first header cell.
	records[0][0] = strings.TrimPrefix(records[0][0], utf8BOM)
	return records[1:], nil
}

func blurayToRecord(b *models.Bluray) []string {
	seasons := make([]string, 0, len(b.Seasons))
	for _, s := range b.Seasons {
		entry := strconv.Itoa(s.Number) + ":" + strconv.Itoa(s.EpisodeCount)
		if s.Year != 0 {
			entry += ":" + strconv.Itoa(s.Year)
		}
		seasons = append(seasons, entry)
	}

	purchaseDate := ""
	if !b.PurchaseDate.IsZero() {
		purchaseDate = b.PurchaseDate.Format(csvDateLayout)
	}

	return []string{
		b.Title,
		string(b.Type),
		strings.Join(b.Genre.En, ";"),
		strings.Join(b.Genre.Fr, ";"),
		b.Description.En,
		b.Description.Fr,
		b.Director,
		formatNonZeroInt(b.ReleaseYear),
		formatNonZeroInt(b.Runtime),
		formatNonZeroFloat(b.Rating, 1),
		formatNonZeroFloat(b.PurchasePrice, 2),
		purchaseDate,
		b.CoverImageURL,
		b.BackdropURL,
		b.TMDBID,
		strings.Join(b.Tags, ";"),
		strings.Join(seasons, ";"),
		formatNonZeroInt(b.TotalEpisodes),
	}
}

// recordToBluray maps an import row back onto a Bluray. Malformed numeric or
// date cells are treated as empty rather than failing the whole row.
func recordToBluray(fields []string) (*models.Bluray, error) {
	if len(fields) < len(csvHeader) {
		return nil, fmt.Errorf("insufficient fields")
	}

	releaseYear, _ := strconv.Atoi(fields[7])
	runtime, _ := strconv.Atoi(fields[8])
	rating, _ := strconv.ParseFloat(fields[9], 64)
	purchasePrice, _ := strconv.ParseFloat(fields[10], 64)
	totalEpisodes, _ := strconv.Atoi(fields[17])

	var purchaseDate time.Time
	if fields[11] != "" {
		purchaseDate, _ = time.Parse(csvDateLayout, fields[11])
	}

	mediaType := models.MediaTypeMovie
	if fields[1] == string(models.MediaTypeSeries) {
		mediaType = models.MediaTypeSeries
	}

	return &models.Bluray{
		Title: fields[0],
		Type:  mediaType,
		Genre: models.I18nTextArray{
			En: splitList(fields[2]),
			Fr: splitList(fields[3]),
		},
		Description: models.I18nText{
			En: fields[4],
			Fr: fields[5],
		},
		Director:      fields[6],
		ReleaseYear:   releaseYear,
		Runtime:       runtime,
		Rating:        rating,
		PurchasePrice: purchasePrice,
		PurchaseDate:  purchaseDate,
		CoverImageURL: fields[12],
		BackdropURL:   fields[13],
		TMDBID:        fields[14],
		Tags:          splitList(fields[15]),
		Seasons:       parseSeasons(fields[16]),
		TotalEpisodes: totalEpisodes,
	}, nil
}

// parseSeasons reads the "number:episodeCount[:year];..." season encoding.
func parseSeasons(s string) []models.Season {
	var seasons []models.Season
	for _, part := range splitList(s) {
		data := strings.Split(part, ":")
		if len(data) < 2 {
			continue
		}
		number, _ := strconv.Atoi(data[0])
		episodeCount, _ := strconv.Atoi(data[1])
		season := models.Season{Number: number, EpisodeCount: episodeCount}
		if len(data) >= 3 {
			season.Year, _ = strconv.Atoi(data[2])
		}
		seasons = append(seasons, season)
	}
	return seasons
}

// splitList splits a ";"-separated cell, dropping empty entries.
func splitList(s string) []string {
	var out []string
	for _, item := range strings.Split(s, ";") {
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}

func formatNonZeroInt(n int) string {
	if n == 0 {
		return ""
	}
	return strconv.Itoa(n)
}

func formatNonZeroFloat(f float64, precision int) string {
	if f == 0 {
		return ""
	}
	return strconv.FormatFloat(f, 'f', precision, 64)
}

// tagResolver translates the Tags column between tag IDs (what blurays store)
// and tag names (what the CSV carries). Names keep an export meaningful when
// it is imported into another instance, whose tags have different IDs.
type tagResolver struct {
	nameByID map[string]string
	idByName map[string]string // keyed by lower-cased name
}

func newTagResolver(tags []*models.Tag) *tagResolver {
	r := &tagResolver{nameByID: map[string]string{}, idByName: map[string]string{}}
	for _, tag := range tags {
		r.add(tag)
	}
	return r
}

func (r *tagResolver) add(tag *models.Tag) {
	id := tag.ID.Hex()
	r.nameByID[id] = tag.Name
	r.idByName[strings.ToLower(tag.Name)] = id
}

// names converts tag IDs to names for export; unknown IDs are dropped since
// they point at deleted tags.
func (r *tagResolver) names(ids []string) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if name, ok := r.nameByID[id]; ok {
			out = append(out, name)
		}
	}
	return out
}

// resolve converts tag references from an import (names, or IDs from exports
// made before tags were written by name) to IDs. Names with no matching tag
// are returned in missing so the caller can create them.
func (r *tagResolver) resolve(refs []string) (ids []string, missing []string) {
	seen := map[string]bool{}
	for _, ref := range refs {
		ref = strings.TrimSpace(ref)
		if ref == "" {
			continue
		}
		id, ok := r.idByName[strings.ToLower(ref)]
		if !ok {
			if _, isID := r.nameByID[ref]; isID {
				id, ok = ref, true
			}
		}
		switch {
		case ok && !seen[id]:
			seen[id] = true
			ids = append(ids, id)
		case !ok && !seen["name:"+strings.ToLower(ref)]:
			seen["name:"+strings.ToLower(ref)] = true
			missing = append(missing, ref)
		}
	}
	return ids, missing
}
