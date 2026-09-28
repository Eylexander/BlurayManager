import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { Trash2, Tag as TagIcon, ExternalLink } from "lucide-react";
import { Bluray } from "@/types/bluray";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/authStore";
import { useConfirm } from "@/components/common";
import ContextMenu from "@/components/common/ContextMenu";
import TagPickerModal from "@/components/modals/TagPickerModal";
import { ROUTES } from "./useRouteProtection";

/**
 * Shared behaviour for bluray cards and list rows: the context menu, tag
 * editing and deletion. Render the returned `overlays` next to the item.
 */
export function useBlurayTools(initialBluray: Bluray, onUpdate?: () => void) {
  const t = useTranslations();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const canModify = role === "admin" || role === "moderator";
  const { confirm, confirmDialog } = useConfirm();

  const [currentBluray, setCurrentBluray] = useState(initialBluray);
  const [showTagModal, setShowTagModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const detailHref = ROUTES.DASHBOARD.BLURAYS.DETAIL.replace("[id]", currentBluray.id);

  const handleDelete = async () => {
    const ok = await confirm({
      title: t("details.deleteTitle", { title: currentBluray.title }),
      message: t("details.deleteWarning"),
      confirmLabel: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    try {
      await apiClient.deleteBluray(currentBluray.id);
      toast.success(t("details.deleteSuccess"));
      onUpdate?.();
    } catch {
      toast.error(t("details.deleteError"));
    }
  };

  /** Opens the context menu at the pointer (right-click, or the ⋮ button on touch). */
  const openMenu = (e: MouseEvent, offsetX = 0) => {
    e.preventDefault();
    if (canModify) setContextMenu({ x: e.clientX + offsetX, y: e.clientY });
  };

  const menuOptions = [
    {
      label: t("details.viewDetails"),
      icon: <ExternalLink className="w-4 h-4" />,
      onClick: () => router.push(detailHref),
    },
    {
      label: t("add.editTags"),
      icon: <TagIcon className="w-4 h-4" />,
      onClick: () => setShowTagModal(true),
    },
    {
      label: t("common.delete"),
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDelete,
      variant: "danger" as const,
      divider: true,
    },
  ];

  const overlays = (
    <>
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} options={menuOptions} onClose={() => setContextMenu(null)} />
      )}
      {showTagModal && (
        <TagPickerModal
          blurayId={currentBluray.id}
          blurayTitle={currentBluray.title}
          initialSelectedTags={currentBluray.tags || []}
          onClose={() => setShowTagModal(false)}
          onSave={(tags) => {
            setCurrentBluray({ ...currentBluray, tags });
            onUpdate?.();
          }}
        />
      )}
      {confirmDialog}
    </>
  );

  return { currentBluray, canModify, detailHref, openMenu, openTags: () => setShowTagModal(true), overlays };
}
