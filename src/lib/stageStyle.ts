// Colors lifted from the official Portola 2026 per-stage flyers (Despacio
// doesn't get its own flyer, so it gets a complementary "after-hours" purple).
export const STAGE_STYLE: Record<string, string> = {
  pier: "bg-pier text-pier-ink",
  crane: "bg-crane text-crane-ink",
  warehouse: "bg-warehouse text-warehouse-ink",
  shiptent: "bg-shiptent text-shiptent-ink",
  despacio: "bg-despacio text-despacio-ink",
};

export const STAGE_LABEL: Record<string, string> = {
  pier: "Pier",
  crane: "Crane",
  warehouse: "Warehouse",
  shiptent: "Ship Tent",
  despacio: "Despacio",
};

/** Tight column headers for the mobile timeline grid — has to fit ~60px wide. */
export const STAGE_SHORT: Record<string, string> = {
  pier: "Pier",
  crane: "Crane",
  warehouse: "Whse",
  shiptent: "Ship",
  despacio: "Desp",
};
