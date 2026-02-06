package api

func escapeCSV(s string) string {
	if s == "" {
		return ""
	}
	// If the string contains comma, quote, or newline, wrap it in quotes and escape quotes
	needsQuotes := false
	for _, ch := range s {
		if ch == ',' || ch == '"' || ch == '\n' || ch == '\r' {
			needsQuotes = true
			break
		}
	}
	if !needsQuotes {
		return s
	}

	// Escape quotes by doubling them
	result := ""
	for _, ch := range s {
		if ch == '"' {
			result += "\"\""
		} else {
			result += string(ch)
		}
	}
	return "\"" + result + "\""
}

func parseCSVLines(content string) [][]string {
	lines := [][]string{}
	currentLine := []string{}
	currentField := ""
	inQuotes := false

	// Iterate through runes (Unicode characters) not bytes
	runes := []rune(content)
	for i := 0; i < len(runes); i++ {
		ch := runes[i]

		if inQuotes {
			if ch == '"' {
				// Check if it's an escaped quote
				if i+1 < len(runes) && runes[i+1] == '"' {
					currentField += "\""
					i++
				} else {
					inQuotes = false
				}
			} else {
				currentField += string(ch)
			}
		} else {
			if ch == '"' {
				inQuotes = true
			} else if ch == ',' {
				currentLine = append(currentLine, currentField)
				currentField = ""
			} else if ch == '\n' {
				currentLine = append(currentLine, currentField)
				if len(currentLine) > 0 {
					lines = append(lines, currentLine)
				}
				currentLine = []string{}
				currentField = ""
			} else if ch != '\r' {
				currentField += string(ch)
			}
		}
	}

	// Add last field and line if not empty
	if currentField != "" || len(currentLine) > 0 {
		currentLine = append(currentLine, currentField)
		lines = append(lines, currentLine)
	}

	return lines
}

func parseCSVTags(s string) []string {
	if s == "" {
		return []string{}
	}
	tags := []string{}
	currentTag := ""
	// Iterate through runes (Unicode characters) not bytes
	for _, ch := range s {
		if ch == ';' {
			if currentTag != "" {
				tags = append(tags, currentTag)
				currentTag = ""
			}
		} else {
			currentTag += string(ch)
		}
	}
	if currentTag != "" {
		tags = append(tags, currentTag)
	}
	return tags
}
