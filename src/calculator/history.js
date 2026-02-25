// Manages calculator history stored in localStorage.
export default class History {
  constructor(key = "calc_history") {
    this.key = key;
  }

  // Return parsed history array; returns empty array if none or parse fails
  getItems() {
    const items = localStorage.getItem(this.key);
    if (!items) return [];
    try {
      return JSON.parse(items);
    } catch (e) {
      console.error("Failed to parse history items:", e);
      return [];
    }
  }

  // Remove history key from localStorage
  clear() {
    localStorage.removeItem(this.key);
  }

  // Append an item to history and persist it
  push(item) {
    let items = this.getItems();
    if (!items) {
      items = [];
    }
    items.push(item);
    localStorage.setItem(this.key, JSON.stringify(items));
  }
}
