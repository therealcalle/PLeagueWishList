// ============================================
// WishlistApp — Main Application Logic
// ============================================

class WishlistApp {
  constructor() {
    this.db = null;
    this.currentPlayer = localStorage.getItem('poe-wishlist-player') || '';
    this.wishes = [];
    this.currentView = 'overview';
    this.channel = null;
  }

  // ------------------------------------------
  // Initialization
  // ------------------------------------------
  async init() {
    if (!this.checkConfig()) {
      document.getElementById('setup-screen').classList.remove('hidden');
      return;
    }

    this.initSupabase();
    this.cacheElements();
    this.populateCategories();
    this.bindEvents();

    if (this.currentPlayer) {
      await this.startApp();
    } else {
      this.showPlayerModal();
    }
  }

  checkConfig() {
    return (
      CONFIG.SUPABASE_URL &&
      CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' &&
      CONFIG.SUPABASE_ANON_KEY &&
      CONFIG.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE'
    );
  }

  initSupabase() {
    this.db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }

  cacheElements() {
    this.el = {
      app: document.getElementById('app'),
      playerModal: document.getElementById('player-modal'),
      playerForm: document.getElementById('player-form'),
      playerNameInput: document.getElementById('player-name-input'),
      playerNameDisplay: document.getElementById('current-player-name'),
      leagueName: document.getElementById('league-name'),
      changePlayerBtn: document.getElementById('change-player-btn'),
      connectionDot: document.getElementById('connection-status'),
      navBtns: document.querySelectorAll('.nav-btn'),
      navStats: document.getElementById('nav-stats'),
      // Filters
      filterSearch: document.getElementById('filter-search'),
      filterCategory: document.getElementById('filter-category'),
      filterPlayer: document.getElementById('filter-player'),
      filterPriority: document.getElementById('filter-priority'),
      filterHideFulfilled: document.getElementById('filter-hide-fulfilled'),
      filterGroupBy: document.getElementById('filter-group-by'),
      // Views
      viewOverview: document.getElementById('view-overview'),
      viewMyWishes: document.getElementById('view-my-wishes'),
      wishesContainer: document.getElementById('wishes-container'),
      emptyState: document.getElementById('empty-state'),
      // Sidebar
      sidebarList: document.getElementById('sidebar-list'),
      // My wishes
      wishForm: document.getElementById('wish-form'),
      wishItem: document.getElementById('wish-item'),
      wishCategory: document.getElementById('wish-category'),
      wishPriority: document.getElementById('wish-priority'),
      wishNotes: document.getElementById('wish-notes'),
      myWishesList: document.getElementById('my-wishes-list'),
      myWishesCount: document.getElementById('my-wishes-count'),
      myEmptyState: document.getElementById('my-empty-state'),
      // Stats & Toasts
      statsBar: document.getElementById('stats-bar'),
      toastContainer: document.getElementById('toast-container'),
      // Confirm modal
      confirmModal: document.getElementById('confirm-modal'),
      confirmTitle: document.getElementById('confirm-title'),
      confirmMessage: document.getElementById('confirm-message'),
      confirmOk: document.getElementById('confirm-ok'),
      confirmCancel: document.getElementById('confirm-cancel'),
    };
  }

  populateCategories() {
    const options = CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    // Wish form category dropdown
    this.el.wishCategory.innerHTML = options;

    // Filter category dropdown
    this.el.filterCategory.innerHTML =
      '<option value="">All Categories</option>' + options;
  }

  // ------------------------------------------
  // Player Modal
  // ------------------------------------------
  showPlayerModal() {
    this.el.playerModal.classList.remove('hidden');
    this.el.app.classList.add('hidden');
    setTimeout(() => this.el.playerNameInput.focus(), 100);
  }

  hidePlayerModal() {
    this.el.playerModal.classList.add('hidden');
  }

  setPlayer(name) {
    this.currentPlayer = name.trim();
    localStorage.setItem('poe-wishlist-player', this.currentPlayer);
    this.el.playerNameDisplay.textContent = this.currentPlayer;
  }

  // ------------------------------------------
  // App Start
  // ------------------------------------------
  async startApp() {
    this.el.app.classList.remove('hidden');
    this.hidePlayerModal();
    this.el.playerNameDisplay.textContent = this.currentPlayer;
    this.el.leagueName.textContent = CONFIG.LEAGUE_NAME;

    await this.fetchWishes();
    this.subscribeRealtime();
    this.render();
  }

  // ------------------------------------------
  // Data — Fetch
  // ------------------------------------------
  async fetchWishes() {
    const { data, error } = await this.db
      .from('wishes')
      .select('*')
      .eq('league', CONFIG.LEAGUE_ID)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch wishes:', error);
      this.showToast('Failed to load wishes', 'error');
      return;
    }
    this.wishes = data || [];
    this.updatePlayerFilter();
  }

  // ------------------------------------------
  // Data — Add
  // ------------------------------------------
  async addWish(item_name, category, priority, notes) {
    const wish = {
      player_name: this.currentPlayer,
      item_name: item_name.trim(),
      category,
      priority,
      notes: notes.trim() || null,
      league: CONFIG.LEAGUE_ID,
    };

    const { data, error } = await this.db
      .from('wishes')
      .insert(wish)
      .select()
      .single();

    if (error) {
      console.error('Failed to add wish:', error);
      this.showToast('Failed to add wish', 'error');
      return false;
    }

    return true;
  }

  // ------------------------------------------
  // Data — Delete
  // ------------------------------------------
  async deleteWish(id) {
    const { error } = await this.db
      .from('wishes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete wish:', error);
      this.showToast('Failed to delete wish', 'error');
    }
  }

  // ------------------------------------------
  // Data — Toggle Fulfilled
  // ------------------------------------------
  async toggleFulfilled(id, fulfilled, fulfilled_by) {
    const { error } = await this.db
      .from('wishes')
      .update({ fulfilled, fulfilled_by })
      .eq('id', id);

    if (error) {
      console.error('Failed to update wish:', error);
      this.showToast('Failed to update wish', 'error');
    }
  }

  // ------------------------------------------
  // Realtime Subscriptions
  // ------------------------------------------
  subscribeRealtime() {
    this.channel = this.db
      .channel('wishes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wishes', filter: `league=eq.${CONFIG.LEAGUE_ID}` },
        (payload) => this.handleRealtimeEvent(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.el.connectionDot.classList.add('connected');
          this.el.connectionDot.classList.remove('error');
          this.el.connectionDot.title = 'Realtime: connected';
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.el.connectionDot.classList.remove('connected');
          this.el.connectionDot.classList.add('error');
          this.el.connectionDot.title = 'Realtime: disconnected';
        }
      });
  }

  handleRealtimeEvent(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    if (eventType === 'INSERT') {
      // Avoid duplicate if we already have it (from our own insert)
      if (!this.wishes.find(w => w.id === newRecord.id)) {
        this.wishes.unshift(newRecord);
        this.showToast(`${newRecord.player_name} added "${newRecord.item_name}"`, 'info');
      }
    } else if (eventType === 'UPDATE') {
      const idx = this.wishes.findIndex(w => w.id === newRecord.id);
      if (idx !== -1) {
        const oldWish = this.wishes[idx];
        this.wishes[idx] = newRecord;
        if (!oldWish.fulfilled && newRecord.fulfilled) {
          this.showToast(`"${newRecord.item_name}" found by ${newRecord.fulfilled_by}!`, 'success');
        }
      }
    } else if (eventType === 'DELETE') {
      this.wishes = this.wishes.filter(w => w.id !== oldRecord.id);
    }

    this.updatePlayerFilter();
    this.render();
  }

  // ------------------------------------------
  // Filtering
  // ------------------------------------------
  getFilteredWishes() {
    let filtered = [...this.wishes];

    const search = this.el.filterSearch.value.toLowerCase().trim();
    const category = this.el.filterCategory.value;
    const player = this.el.filterPlayer.value;
    const priority = this.el.filterPriority.value;
    const hideFulfilled = this.el.filterHideFulfilled.checked;

    if (search) {
      filtered = filtered.filter(w =>
        w.item_name.toLowerCase().includes(search) ||
        w.player_name.toLowerCase().includes(search) ||
        (w.notes && w.notes.toLowerCase().includes(search))
      );
    }
    if (category) filtered = filtered.filter(w => w.category === category);
    if (player) filtered = filtered.filter(w => w.player_name === player);
    if (priority) filtered = filtered.filter(w => w.priority === priority);
    if (hideFulfilled) filtered = filtered.filter(w => !w.fulfilled);

    const pOrder = {high: 0, normal: 1, low: 2};
    filtered.sort((a, b) => (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1));

    return filtered;
  }

  getMyWishes() {
    return this.wishes.filter(w => w.player_name === this.currentPlayer);
  }

  updatePlayerFilter() {
    const players = [...new Set(this.wishes.map(w => w.player_name))].sort();
    const current = this.el.filterPlayer.value;
    this.el.filterPlayer.innerHTML =
      '<option value="">All Players</option>' +
      players.map(p => `<option value="${this.escapeHtml(p)}"${p === current ? ' selected' : ''}>${this.escapeHtml(p)}</option>`).join('');
  }

  // ------------------------------------------
  // Rendering — Main
  // ------------------------------------------
  render() {
    if (this.currentView === 'overview') {
      this.renderOverview();
    } else {
      this.renderMyWishes();
    }
    this.renderStats();
  }

  // ------------------------------------------
  // Rendering — Sidebar Player List
  // ------------------------------------------
  renderSidebar() {
    const byPlayer = new Map();
    for (const w of this.wishes) {
      if (!byPlayer.has(w.player_name)) {
        byPlayer.set(w.player_name, []);
      }
      byPlayer.get(w.player_name).push(w);
    }

    if (byPlayer.size === 0) {
      this.el.sidebarList.innerHTML = '';
      return;
    }

    const players = Array.from(byPlayer.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    this.el.sidebarList.innerHTML = players.map(([name, wishes]) => {
      const open = wishes.filter(w => !w.fulfilled);
      const fulfilled = wishes.filter(w => w.fulfilled);

      // Group by category, merging gem and unique subcategories into one each
      const gemIds = new Set(['gem-str', 'gem-dex', 'gem-int', 'gem-other']);
      const uniqueIds = new Set(['unique-armour', 'unique-weapon', 'unique-accessory', 'unique-flask', 'unique-jewel']);
      const GEM_GROUP = '_gems';
      const UNIQUE_GROUP = '_uniques';
      const byCat = new Map();
      for (const w of open) {
        const groupKey = gemIds.has(w.category) ? GEM_GROUP
          : uniqueIds.has(w.category) ? UNIQUE_GROUP
          : w.category;
        if (!byCat.has(groupKey)) byCat.set(groupKey, []);
        byCat.get(groupKey).push(w);
      }

      // Sort categories: those with high-priority items first, then by defined order
      const catOrder = CATEGORIES.map(c => c.id);
      const sortedCats = Array.from(byCat.entries()).sort((a, b) => {
        const aHasHigh = a[1].some(w => w.priority === 'high') ? 0 : 1;
        const bHasHigh = b[1].some(w => w.priority === 'high') ? 0 : 1;
        if (aHasHigh !== bHasHigh) return aHasHigh - bHasHigh;
        const ai = a[0] === GEM_GROUP ? catOrder.indexOf('gem-str')
          : a[0] === UNIQUE_GROUP ? catOrder.indexOf('unique-armour')
          : catOrder.indexOf(a[0]);
        const bi = b[0] === GEM_GROUP ? catOrder.indexOf('gem-str')
          : b[0] === UNIQUE_GROUP ? catOrder.indexOf('unique-armour')
          : catOrder.indexOf(b[0]);
        return ai - bi;
      });

      const catSections = sortedCats.map(([catId, items]) => {
        const isGemGroup = catId === GEM_GROUP;
        const isUniqueGroup = catId === UNIQUE_GROUP;
        const cat = isGemGroup ? { name: 'Gems', color: '#1ba29b' }
          : isUniqueGroup ? { name: 'Uniques', color: '#af6025' }
          : getCategoryById(catId);
        const itemsHtml = items
          .sort((a, b) => { const o = {high:0,normal:1,low:2}; return (o[a.priority]||1)-(o[b.priority]||1); })
          .map(w => {
            const star = w.priority === 'high' ? '<span class="si-star">★</span> ' : '';
            const gemColor = gemIds.has(w.category) ? ` style="color: ${getCategoryById(w.category).color}"` : '';
            return `<div class="sidebar-item"${gemColor}>${star}${this.escapeHtml(w.item_name)}</div>`;
          }).join('');
        return `<div class="sidebar-category">
          <div class="sidebar-category-name" style="color: ${cat.color}">${cat.name}</div>
          <div class="sidebar-items">${itemsHtml}</div>
        </div>`;
      }).join('');

      const isCurrentPlayer = name === this.currentPlayer;

      return `
        <div class="sidebar-player">
          <div class="sidebar-player-header">
            <span class="sidebar-player-name">${this.escapeHtml(name)}</span>
            <span class="sidebar-player-count">${open.length} open</span>
          </div>
          ${catSections}
        </div>`;
    }).join('');
  }

  // ------------------------------------------
  // Rendering — Overview
  // ------------------------------------------
  renderOverview() {
    this.renderSidebar();
    const filtered = this.getFilteredWishes();
    const groupBy = this.el.filterGroupBy.value;

    if (filtered.length === 0) {
      this.el.wishesContainer.innerHTML = '';
      this.el.emptyState.classList.remove('hidden');
      if (this.wishes.length > 0) {
        this.el.emptyState.querySelector('h3').textContent = 'No matches';
        this.el.emptyState.querySelector('p').textContent = 'Try adjusting filters';
      } else {
        this.el.emptyState.querySelector('h3').textContent = 'No wishes yet';
        this.el.emptyState.querySelector('p').textContent = 'Be the first to add something to the wishlist!';
      }
      return;
    }

    this.el.emptyState.classList.add('hidden');

    if (groupBy === 'none') {
      this.el.wishesContainer.innerHTML =
        '<div class="wishes-grid">' +
        filtered.map(w => this.renderWishCard(w)).join('') +
        '</div>';
    } else {
      const groups = this.groupWishesBy(filtered, groupBy);
      this.el.wishesContainer.innerHTML = groups.map(g => `
        <div class="wishes-group">
          <div class="wishes-group-header">
            <h3>${this.escapeHtml(g.label)}</h3>
            <span class="group-count">${g.wishes.length}</span>
          </div>
          <div class="wishes-grid">
            ${g.wishes.map(w => this.renderWishCard(w)).join('')}
          </div>
        </div>
      `).join('');
    }
  }

  groupWishesBy(wishes, key) {
    const map = new Map();

    for (const w of wishes) {
      let groupKey, label;
      if (key === 'player') {
        groupKey = w.player_name;
        label = w.player_name;
      } else {
        const cat = getCategoryById(w.category);
        groupKey = w.category;
        label = cat.name;
      }
      if (!map.has(groupKey)) {
        map.set(groupKey, { label, wishes: [] });
      }
      map.get(groupKey).wishes.push(w);
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  renderWishCard(wish) {
    const cat = getCategoryById(wish.category);
    const priorityClass = `priority-${wish.priority}`;
    const fulfilledClass = wish.fulfilled ? 'fulfilled' : '';
    const priorityIcon = wish.priority === 'high' ? '★' : '';
    const isOwn = wish.player_name === this.currentPlayer;
    const timeAgo = this.timeAgo(wish.created_at);

    let footerHtml = '';
    if (wish.fulfilled) {
      footerHtml = `
        <div class="wish-fulfilled-info">✓ Found by ${this.escapeHtml(wish.fulfilled_by || 'someone')}</div>
        <div class="wish-actions">
          <button class="btn btn-ghost btn-sm" data-action="unfulfill" data-id="${wish.id}" title="Mark as not found">Undo</button>
          ${isOwn ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${wish.id}" title="Remove from wishlist">✕</button>` : ''}
        </div>`;
    } else {
      footerHtml = `
        <span class="wish-time">${timeAgo}</span>
        <div class="wish-actions">
          <button class="btn btn-success btn-sm" data-action="fulfill" data-id="${wish.id}">
            ✓ Found it!
          </button>
          ${isOwn ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${wish.id}" title="Delete">✕</button>` : ''}
        </div>`;
    }

    return `
      <div class="wish-card ${priorityClass} ${fulfilledClass}" data-wish-id="${wish.id}">
        <div class="wish-card-header">
          <span class="wish-item-name">${this.escapeHtml(wish.item_name)}</span>
          <span class="wish-priority-icon" title="${wish.priority} priority">${priorityIcon}</span>
        </div>
        <div class="wish-meta">
          <span class="wish-category-badge" style="border-color: ${cat.color}40; color: ${cat.color}">
            ${cat.name}
          </span>
          <span class="wish-player-badge">by <strong>${this.escapeHtml(wish.player_name)}</strong></span>
        </div>
        ${wish.notes ? `<div class="wish-notes">${this.escapeHtml(wish.notes)}</div>` : ''}
        <div class="wish-card-footer">
          ${footerHtml}
        </div>
      </div>`;
  }

  // ------------------------------------------
  // Rendering — My Wishes
  // ------------------------------------------
  renderMyWishes() {
    const myWishes = this.getMyWishes();
    this.el.myWishesCount.textContent = `(${myWishes.length})`;

    if (myWishes.length === 0) {
      this.el.myWishesList.innerHTML = '';
      this.el.myEmptyState.classList.remove('hidden');
      return;
    }

    this.el.myEmptyState.classList.add('hidden');
    this.el.myWishesList.innerHTML = myWishes.map(w => {
      const cat = getCategoryById(w.category);
      const priorityClass = `priority-${w.priority}`;
      const fulfilledClass = w.fulfilled ? 'fulfilled' : '';
      const priorityIcon = w.priority === 'high' ? '★' : '';

      return `
        <div class="my-wish-item ${priorityClass} ${fulfilledClass}" data-wish-id="${w.id}">
          <div class="my-wish-info">
            <div class="my-wish-name">${priorityIcon ? priorityIcon + ' ' : ''}${this.escapeHtml(w.item_name)}</div>
            <div class="my-wish-detail">
              <span class="wish-category-badge" style="border-color: ${cat.color}40; color: ${cat.color}">
                ${cat.name}
              </span>
              ${w.notes ? `<span>${this.escapeHtml(w.notes)}</span>` : ''}
              ${w.fulfilled ? `<span style="color: var(--fulfilled)">✓ Found by ${this.escapeHtml(w.fulfilled_by || 'someone')}</span>` : ''}
            </div>
          </div>
          <div class="my-wish-actions">
            ${w.fulfilled
              ? `<button class="btn btn-ghost btn-sm" data-action="unfulfill" data-id="${w.id}">Undo</button>`
              : `<button class="btn btn-success btn-sm" data-action="fulfill" data-id="${w.id}">✓ Found</button>`
            }
            <button class="btn btn-danger btn-sm" data-action="delete" data-id="${w.id}" title="Delete">✕</button>
          </div>
        </div>`;
    }).join('');
  }

  // ------------------------------------------
  // Rendering — Stats
  // ------------------------------------------
  renderStats() {
    const total = this.wishes.length;
    const fulfilled = this.wishes.filter(w => w.fulfilled).length;
    const players = new Set(this.wishes.map(w => w.player_name)).size;
    const highPriority = this.wishes.filter(w => w.priority === 'high' && !w.fulfilled).length;

    this.el.statsBar.innerHTML = `
      <div class="stat-item"><span class="stat-icon">🗎</span> <span class="stat-value">${total}</span> wishes</div>
      ${highPriority > 0 ? `<div class="stat-item"><span class="stat-icon">★</span> <span class="stat-value">${highPriority}</span> high priority</div>` : ''}
      <div class="stat-item"><span class="stat-icon">✓</span> <span class="stat-value">${fulfilled}</span> fulfilled</div>
    `;

    const myWishes = this.wishes.filter(w => w.player_name === this.currentPlayer);
    const myTotal = myWishes.length;
    const myFulfilled = myWishes.filter(w => w.fulfilled).length;
    const myOpen = myTotal - myFulfilled;

    this.el.navStats.innerHTML = `${myOpen} wishes` +
      (myFulfilled > 0 ? ` · <span class="nav-stats-fulfilled">${myFulfilled} fulfilled</span>` : '');
  }

  // ------------------------------------------
  // Events
  // ------------------------------------------
  bindEvents() {
    // Player form
    this.el.playerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = this.el.playerNameInput.value.trim();
      if (name) {
        this.setPlayer(name);
        this.startApp();
      }
    });

    // Change player
    this.el.changePlayerBtn.addEventListener('click', () => {
      this.el.playerNameInput.value = this.currentPlayer;
      this.showPlayerModal();
    });

    // Navigation
    this.el.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Filters (debounced search, instant for dropdowns)
    let searchTimer;
    this.el.filterSearch.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => this.render(), 200);
    });
    this.el.filterCategory.addEventListener('change', () => this.render());
    this.el.filterPlayer.addEventListener('change', () => this.render());
    this.el.filterPriority.addEventListener('change', () => this.render());
    this.el.filterHideFulfilled.addEventListener('change', () => this.render());
    this.el.filterGroupBy.addEventListener('change', () => this.render());

    // Wish form
    this.el.wishForm.addEventListener('submit', (e) => this.handleAddWish(e));

    // Delegated click handlers for wish actions
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'fulfill') this.handleFulfill(id);
      else if (action === 'unfulfill') this.handleUnfulfill(id);
      else if (action === 'delete') this.handleDelete(id);
    });

    // Close confirm modal on backdrop click
    this.el.confirmModal.querySelector('.modal-backdrop').addEventListener('click', () => {
      this.el.confirmModal.classList.add('hidden');
    });
  }

  switchView(view) {
    this.currentView = view;

    this.el.navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');

    this.render();
  }

  // ------------------------------------------
  // Action Handlers
  // ------------------------------------------
  async handleAddWish(e) {
    e.preventDefault();
    const item = this.el.wishItem.value;
    const category = this.el.wishCategory.value;
    const priority = this.el.wishPriority.value;
    const notes = this.el.wishNotes.value;

    const submitBtn = this.el.wishForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const success = await this.addWish(item, category, priority, notes);
    submitBtn.disabled = false;

    if (success) {
      this.el.wishForm.reset();
      this.el.wishItem.focus();
      // Re-fetch to get the new wish with server-generated fields
      await this.fetchWishes();
      this.render();
      this.showToast(`Added "${item}" to your wishlist`, 'success');
    }
  }

  async handleFulfill(id) {
    const wish = this.wishes.find(w => w.id === id);
    if (!wish) return;

    this.confirm(
      'Found it!',
      `Mark "${wish.item_name}" (wanted by ${wish.player_name}) as found?`,
      async () => {
        await this.toggleFulfilled(id, true, this.currentPlayer);

        // Optimistic update
        const w = this.wishes.find(w => w.id === id);
        if (w) {
          w.fulfilled = true;
          w.fulfilled_by = this.currentPlayer;
          this.render();
        }
      }
    );
  }

  async handleUnfulfill(id) {
    await this.toggleFulfilled(id, false, null);

    const w = this.wishes.find(w => w.id === id);
    if (w) {
      w.fulfilled = false;
      w.fulfilled_by = null;
      this.render();
    }
  }

  async handleDelete(id) {
    const wish = this.wishes.find(w => w.id === id);
    if (!wish) return;

    this.confirm(
      'Delete Wish',
      `Remove "${wish.item_name}" from the wishlist?`,
      async () => {
        await this.deleteWish(id);
        this.wishes = this.wishes.filter(w => w.id !== id);
        this.render();
        this.showToast(`Removed "${wish.item_name}"`, 'info');
      }
    );
  }

  // ------------------------------------------
  // Confirm Dialog
  // ------------------------------------------
  confirm(title, message, onConfirm) {
    this.el.confirmTitle.textContent = title;
    this.el.confirmMessage.textContent = message;
    this.el.confirmModal.classList.remove('hidden');

    const cleanup = () => {
      this.el.confirmOk.removeEventListener('click', handleOk);
      this.el.confirmCancel.removeEventListener('click', handleCancel);
      this.el.confirmModal.classList.add('hidden');
    };

    const handleOk = () => { cleanup(); onConfirm(); };
    const handleCancel = () => { cleanup(); };

    this.el.confirmOk.addEventListener('click', handleOk);
    this.el.confirmCancel.addEventListener('click', handleCancel);
  }

  // ------------------------------------------
  // Toast Notifications
  // ------------------------------------------
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ------------------------------------------
  // Utilities
  // ------------------------------------------
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
}

// ------------------------------------------
// Boot
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const app = new WishlistApp();
  app.init();
});
