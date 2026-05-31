import type { MyAssetItem } from "@/components/my-assets-grid";

export interface MyAssetStatusUpdate {
  id: string;
  status: MyAssetItem["status"];
  result?: {
    modelUrl?: string;
  } | null;
  errorMessage?: string;
}

export function mergeMyAssetStatusUpdate(
  items: MyAssetItem[],
  update: MyAssetStatusUpdate
): MyAssetItem[] {
  return items.map((item) => {
    if (item.id !== update.id) return item;

    return {
      ...item,
      status: update.status,
      modelUrl: update.result?.modelUrl || item.modelUrl,
      errorMessage: update.errorMessage || item.errorMessage,
    };
  });
}
