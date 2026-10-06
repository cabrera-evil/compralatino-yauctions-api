// Read-only operations mirroring the shapes the public site itself sends; never select personal data.
// Variable type names of `auctions` are unknown, so the page size is inlined as a validated integer.
export const buildAuctionsQuery = (pageSize: number): string => {
	if (!Number.isInteger(pageSize) || pageSize < 1)
		throw new RangeError('pageSize must be a positive integer');
	return `
query Auctions {
  auctions(
    filter: { auction_status: [100, 200], is_visible_on_front: true, limit_highlights: false }
    order: { column: "end_time", direction: "asc" }
    pagination: { page: 1, pageSize: ${pageSize} }
    search: { text: "" }
  ) {
    total
    auctions {
      auction_id auction_ref title type start_time end_time public_url front_visible_lot_count auction_status
      auction_location { line_1 city state_name zip_code country_id }
    }
  }
}`;
};

export const AUCTION_LOTS_QUERY = `
query AuctionLots($auction_id: String!, $pagination: Pagination) {
  auction(auction_id: $auction_id) {
    auction_id
    lots(
      filter: { auction_id: $auction_id, end_time_from: "now", is_visible: true, limit_visibility_by_pick_up_locs: true }
      order: [{ column: "lot_number", direction: "asc" }]
      pagination: $pagination
      search: { text: "" }
    ) {
      total
      lots {
        auction_lot_id auction_id lot_number title description start_time end_time
        bid_count bid_increment_amount required_bid starting_bid winning_bid_amount
        same_as_auction_location
        lot_location { line_1 city state_name }
        is_past_end_time is_passed is_no_sale
        category_id category { category_id name paths { category_id name } }
        primary_image dynamic_fields { label type dynamic_field_id data options }
      }
    }
  }
}`;

export const LOT_DETAIL_QUERY = `
query Lot($auction_lot_id: String!) {
  lot(auction_lot_id: $auction_lot_id) {
    auction_lot_id description_plain
    images { attachment_id cached_assets { variant url } }
  }
}`;
