import { GameLibrary } from './types';

export class WarningDisplay {
  private static warningElement: HTMLElement | null = null;

  static showWarning(ownedGames: GameLibrary[], _currentTitle: string) {
    this.hideWarning(); // Remove any existing warning

    // Find the purchase area on Steam
    const purchaseArea = document.querySelector(
      '.game_purchase_action, .game_area_purchase_game, .game_purchase_sub_dropdown'
    );
    if (!purchaseArea) return;

    const platforms = ownedGames.map(game => game.platform).join(', ');
    const platformText =
      ownedGames.length === 1
        ? `You own this game on <strong>${platforms}</strong>`
        : `You own this game on <strong>${platforms}</strong>`;

    const warning = document.createElement('div');
    warning.id = 'stop-before-you-buy-warning';
    warning.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #4c6b22, #5c7e2a);
        color: #beee11;
        padding: 12px 16px;
        margin-bottom: 8px;
        border-radius: 3px;
        border: 1px solid #5c7e2a;
        font-family: 'Motiva Sans', Arial, Helvetica, sans-serif;
        font-size: 12px;
        font-weight: normal;
        text-shadow: 1px 1px 0px rgba(0,0,0,0.9);
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
      ">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="
            background: #beee11;
            color: #4c6b22;
            padding: 2px 6px;
            border-radius: 2px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 8px;
            text-shadow: none;
          ">OWNED</div>
          <span style="font-weight: bold;">Already in your library</span>
        </div>
        <div style="font-size: 11px; opacity: 0.9;">
          ${platformText}
        </div>
      </div>
    `;

    // Insert the warning before the purchase area
    purchaseArea.parentNode?.insertBefore(warning, purchaseArea);
    this.warningElement = warning;
  }

  static showCartWarning(cartItem: HTMLElement, ownedGames: GameLibrary[]) {
    // Check if warning already exists for this item
    if (cartItem.querySelector('.cart-ownership-warning')) {
      return;
    }

    const platforms = ownedGames.map(game => game.platform).join(', ');
    const warning = document.createElement('div');
    warning.className = 'cart-ownership-warning';
    warning.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #d4a017, #e6b800);
        color: #2a1f00;
        padding: 12px 16px;
        margin: 16px 0;
        border-radius: 3px;
        border: 1px solid #b8941a;
        font-family: 'Motiva Sans', Arial, Helvetica, sans-serif;
        font-size: 11px;
        font-weight: bold;
        text-shadow: none;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.2);
        z-index: 1000;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      ">
        <span style="margin-right: 8px;">⚠</span>
        <span>Owned on ${platforms}</span>
      </div>
    `;

    // Try multiple insertion strategies
    // Strategy 1: Look for any div that contains the game title (more robust)
    let insertTarget = cartItem.querySelector('div[id*=":r"]')?.parentElement;
    if (insertTarget) {
      insertTarget.appendChild(warning);
      return;
    }

    // Strategy 2: Look for any div that seems to be a content container
    const contentDivs = cartItem.querySelectorAll('div');
    for (const div of contentDivs) {
      if (div.children.length > 2 && div.offsetHeight > 100) {
        div.appendChild(warning);
        return;
      }
    }

    // Strategy 3: Just append to the cart item itself
    cartItem.appendChild(warning);
  }

  static hideWarning() {
    if (this.warningElement) {
      this.warningElement.remove();
      this.warningElement = null;
    }
  }
}