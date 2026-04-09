// DESIGN.md Playground Client Helpers
(function () {
  'use strict';

  // --- SSE: auto-reload on new content ---
  function connectSSE() {
    const es = new EventSource('/events');
    es.addEventListener('reload', function () {
      window.location.reload();
    });
    es.onerror = function () {
      // Reconnect after 2s on error
      es.close();
      setTimeout(connectSSE, 2000);
    };
  }
  connectSSE();

  // --- Selection helpers ---

  /**
   * Update the indicator badge with current selection count.
   */
  function updateIndicator() {
    const indicator = document.getElementById('pg-indicator');
    if (!indicator) return;
    const count = document.querySelectorAll('.selected').length;
    indicator.textContent = count > 0 ? count + ' selected' : '';
    indicator.style.display = count > 0 ? 'inline-block' : 'none';
  }

  /**
   * Toggle selection on an .option or .card element.
   * Respects data-multiselect on the parent container.
   * Supports data-category and data-choice attributes.
   *
   * @param {HTMLElement} el - The element to toggle
   */
  window.toggleSelect = function (el) {
    if (!el) return;
    const container = el.closest('[data-multiselect]') || el.parentElement;
    const isMulti = container && container.hasAttribute('data-multiselect');

    if (el.classList.contains('selected')) {
      el.classList.remove('selected');
    } else {
      if (!isMulti) {
        // Single-select: deselect siblings in same container
        const siblings = container ? container.querySelectorAll('.option.selected, .card.selected') : [];
        siblings.forEach(function (s) { s.classList.remove('selected'); });
      }
      el.classList.add('selected');
    }
    updateIndicator();
  };

  /**
   * Gather all .selected elements and POST to /record with type "complete".
   */
  window.completeSelection = function () {
    const selected = Array.from(document.querySelectorAll('.selected'));
    const choices = selected.map(function (el) {
      return {
        category: el.dataset.category || null,
        choice:   el.dataset.choice   || el.textContent.trim().slice(0, 80),
        text:     el.textContent.trim().slice(0, 200),
      };
    });

    fetch('/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'complete', choices: choices }),
    }).catch(function (err) {
      console.warn('[playground] record error:', err);
    });
  };

  // Auto-bind click handlers for .option and .card elements
  document.addEventListener('click', function (e) {
    const target = /** @type {HTMLElement} */ (e.target);
    const el = target.closest('.option, .card');
    if (el) {
      window.toggleSelect(/** @type {HTMLElement} */ (el));
    }
  });

  // Initialise indicator on load
  document.addEventListener('DOMContentLoaded', updateIndicator);
  updateIndicator();
})();
