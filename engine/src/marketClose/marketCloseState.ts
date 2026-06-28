let marketOpen = false;

function updateMarketState() {
  const now = new Date();

  const day = now.getDay(); // 0 = Sunday, 6 = Saturday

  if (day === 0 || day === 6) {
    marketOpen = false;
    return;
  }

  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;

  marketOpen = minutes >= open && minutes < close;
}

export function isMarketOpen() {
  updateMarketState();
  return marketOpen;
}
