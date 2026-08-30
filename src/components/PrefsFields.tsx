export function PrefsFields() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">Which days are you at Portola?</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="attendingSaturday"
            defaultChecked
            className="h-4 w-4 rounded accent-yellow-400"
          />
          Saturday
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="attendingSunday"
            defaultChecked
            className="h-4 w-4 rounded accent-yellow-400"
          />
          Sunday
        </label>
      </div>
      <p className="text-xs text-muted pt-1">Ticket type?</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="ticketType"
            value="GA"
            defaultChecked
            className="accent-yellow-400"
          />
          GA
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="ticketType" value="VIP" className="accent-yellow-400" />
          VIP
        </label>
      </div>
    </div>
  );
}
