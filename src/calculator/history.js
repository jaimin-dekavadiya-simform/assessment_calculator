export default class History {
  constructor(key = "calc_history") {
    this.key = key;
  }
  getItems() {
    const items = localStorage.getItem(this.key);
    return JSON.parse(items);
  }
  clear() {
    localStorage.clear(this.key);
  }
  push(item) {
    let items = this.getItems();
    if (!items) {
      items = [];
    }
    items.push(item);
    localStorage.setItem(this.key, JSON.stringify(items));
  }
}
