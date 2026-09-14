/**
 * Client-only Ændringsaftale demo (PR #36 UX mock).
 * No live API — state in localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'bp-sketch-aendring-v1';
  var DEMO_FIRM = 'Nordisk Mur ApS';
  var DEMO_JOB = 'Badeværelse — fliser & vådrum';
  var MOMS = 0.25;

  var STATUS_LABEL = {
    pending: 'Afventer kunden',
    approved: 'Godkendt',
    rejected: 'Afvist',
  };

  function formatDkk(n) {
    var v = Math.round(Number(n) || 0);
    return (
      v.toLocaleString('da-DK') + '\u00a0kr.'
    );
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seed();
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.orders)) return seed();
      return data;
    } catch (e) {
      return seed();
    }
  }

  function seed() {
    var data = {
      firmName: DEMO_FIRM,
      jobLabel: DEMO_JOB,
      orders: [
        {
          id: 'demo-1',
          description: 'Ekstra stikkontakt i køkken, 2 timer',
          amountDkk: 1800,
          status: 'pending',
          createdAt: Date.now() - 3600 * 1000,
        },
      ],
    };
    save(data);
    return data;
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function parseAmount(raw) {
    var s = String(raw || '')
      .trim()
      .replace(/\s/g, '')
      .replace(/kr\.?/gi, '');
    if (!s) return null;
    var normalized = s;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) {
      normalized = s.replace(/\./g, '').replace(',', '.');
    } else if (s.indexOf(',') >= 0) {
      normalized = s.replace(',', '.');
    }
    var n = Number(normalized);
    if (!isFinite(n) || n < 1) return null;
    var rounded = Math.round(n);
    if (rounded < 1 || rounded > 10000000) return null;
    return rounded;
  }

  function toast(el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'aendring-toast is-on aendring-toast--' + (kind || 'info');
  }

  function clearToast(el) {
    if (!el) return;
    el.className = 'aendring-toast';
    el.textContent = '';
  }

  function badgeHtml(status) {
    return (
      '<span class="badge-status badge-status--' +
      status +
      '">' +
      (STATUS_LABEL[status] || status) +
      '</span>'
    );
  }

  function customerTotal(exMoms) {
    return Math.round(exMoms * (1 + MOMS));
  }

  /* —— Firm page —— */
  function initFirma() {
    var data = load();
    var form = document.getElementById('aendring-form');
    var list = document.getElementById('order-list');
    var toastEl = document.getElementById('firma-toast');
    var draftMsg = document.getElementById('tillags-msg');
    var jobChip = document.getElementById('job-chip');

    if (jobChip) {
      jobChip.innerHTML =
        '<strong>' +
        escapeHtml(data.firmName) +
        '</strong> · ' +
        escapeHtml(data.jobLabel);
    }

    function render() {
      data = load();
      if (!list) return;
      if (!data.orders.length) {
        list.innerHTML = '';
        return;
      }
      list.innerHTML = data.orders
        .slice()
        .reverse()
        .map(function (o) {
          var note = '';
          var actions = '';
          if (o.status === 'pending') {
            actions =
              '<div class="order-item__actions">' +
              '<a class="btn btn--sm btn--ghost" href="aendring-kunde.html?id=' +
              encodeURIComponent(o.id) +
              '">Åbn kundelink (demo)</a>' +
              '<button type="button" class="btn btn--sm btn--ghost" data-copy="' +
              escapeAttr(o.id) +
              '">Kopiér link</button>' +
              '</div>';
          }
          if (o.status === 'approved') {
            note =
              '<p class="order-item__note order-item__note--ok">✓ Godkendt — tillægsfaktura-kladde oprettet</p>';
            actions =
              '<div class="order-item__actions">' +
              '<button type="button" class="btn btn--sm btn--ghost" disabled>Åbn tillægsfaktura (sketch)</button>' +
              '</div>';
          }
          if (o.status === 'rejected') {
            note =
              '<p class="order-item__note order-item__note--bad">✕ Afvist</p>';
          }
          return (
            '<li class="order-item" data-id="' +
            escapeAttr(o.id) +
            '">' +
            '<div class="order-item__top">' +
            badgeHtml(o.status) +
            '<span class="order-item__amt">' +
            formatDkk(o.amountDkk) +
            ' ekskl. moms</span>' +
            '</div>' +
            '<p class="order-item__desc">' +
            escapeHtml(o.description) +
            '</p>' +
            note +
            actions +
            '</li>'
          );
        })
        .join('');

      var approved = data.orders.some(function (o) {
        return o.status === 'approved';
      });
      if (draftMsg) {
        if (approved) {
          draftMsg.className = 'aendring-toast is-on aendring-toast--ok';
          draftMsg.textContent =
            'Tillægsfaktura-kladde oprettet — klar til at udstedes (demo, ingen API).';
        } else {
          clearToast(draftMsg);
        }
      }
    }

    if (list) {
      list.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-copy]');
        if (!btn) return;
        var id = btn.getAttribute('data-copy');
        var url =
          location.origin +
          location.pathname.replace(/[^/]*$/, '') +
          'aendring-kunde.html?id=' +
          encodeURIComponent(id);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(
            function () {
              toast(toastEl, 'Link kopieret', 'ok');
            },
            function () {
              toast(toastEl, 'Kunne ikke kopiere — markér linket manuelt', 'info');
            }
          );
        } else {
          toast(toastEl, url, 'info');
        }
      });
    }

    if (form) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var descEl = document.getElementById('co-desc');
        var amtEl = document.getElementById('co-amount');
        var errEl = document.getElementById('co-amount-error');
        var desc = (descEl.value || '').trim().replace(/\s+/g, ' ');
        var parsed = parseAmount(amtEl.value);
        if (errEl) errEl.textContent = '';
        if (!desc) {
          toast(toastEl, 'Skriv en kort beskrivelse af ekstraarbejdet', 'err');
          return;
        }
        if (parsed == null) {
          if (errEl) errEl.textContent = 'Angiv beløb i hele kr. (min. 1)';
          toast(toastEl, 'Angiv et gyldigt beløb', 'err');
          return;
        }
        data = load();
        data.orders.push({
          id: 'demo-' + Date.now().toString(36),
          description: desc.slice(0, 2000),
          amountDkk: parsed,
          status: 'pending',
          createdAt: Date.now(),
        });
        save(data);
        descEl.value = '';
        amtEl.value = '';
        toast(
          toastEl,
          'Sendt til kunden — de godkender via linket i mailen (demo)',
          'ok'
        );
        var panel = document.getElementById('create-panel');
        if (panel) panel.hidden = true;
        var toggle = document.getElementById('toggle-create');
        if (toggle) toggle.textContent = 'Ændringsaftale';
        render();
      });
    }

    var toggle = document.getElementById('toggle-create');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var panel = document.getElementById('create-panel');
        if (!panel) return;
        var open = panel.hidden;
        panel.hidden = !open;
        toggle.textContent = open ? 'Annuller' : 'Ændringsaftale';
        toggle.classList.toggle('btn--primary', open);
        toggle.classList.toggle('btn--ghost', !open);
      });
    }

    var resetBtn = document.getElementById('reset-demo');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        localStorage.removeItem(STORAGE_KEY);
        seed();
        clearToast(toastEl);
        render();
        toast(toastEl, 'Demo nulstillet', 'info');
      });
    }

    render();
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) render();
    });
  }

  /* —— Customer public page —— */
  function initKunde() {
    var data = load();
    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    var order =
      (id &&
        data.orders.find(function (o) {
          return o.id === id;
        })) ||
      data.orders.find(function (o) {
        return o.status === 'pending';
      }) ||
      data.orders[data.orders.length - 1];

    var root = document.getElementById('kunde-root');
    var toastEl = document.getElementById('kunde-toast');
    if (!root) return;

    if (!order) {
      root.innerHTML =
        '<div class="aendring-card" style="text-align:center">' +
        '<h1>Linket virker ikke</h1>' +
        '<p class="aendring-lead">Ugyldigt eller udløbet link. (Demo — opret en aftale på firmasiden.)</p>' +
        '<p><a class="btn btn--primary" href="aendring-firma.html">Til firmaside</a></p>' +
        '</div>';
      return;
    }

    function renderOrder() {
      data = load();
      order =
        data.orders.find(function (o) {
          return o.id === order.id;
        }) || order;

      var pending = order.status === 'pending';
      var total = customerTotal(order.amountDkk);
      var statusBlock = '';
      if (!pending) {
        statusBlock =
          '<p class="status-pill status-pill--' +
          (order.status === 'approved' ? 'ok' : 'bad') +
          '">' +
          (order.status === 'approved' ? '✓ ' : '✕ ') +
          STATUS_LABEL[order.status] +
          (order.status === 'approved'
            ? ' — firmaet opretter tillægsfaktura ud fra denne pris.'
            : '.') +
          '</p>';
        if (order.status === 'approved') {
          statusBlock +=
            '<div class="aendring-toast is-on aendring-toast--ok" style="margin-top:0.75rem">' +
            'Tillægsfaktura-kladde oprettet (demo — ingen rigtig faktura).' +
            '</div>';
        }
      }

      var actions = '';
      if (pending) {
        actions =
          '<div class="aendring-actions aendring-actions--row">' +
          '<button type="button" class="btn btn--primary btn--full" id="btn-approve">Godkend</button>' +
          '<button type="button" class="btn btn--ghost btn--full" id="btn-reject">Afvis</button>' +
          '</div>';
      }

      root.innerHTML =
        '<div class="aendring-card">' +
        '<p class="aendring-kicker">Ændringsaftale</p>' +
        '<h1>Ekstraarbejde til godkendelse</h1>' +
        '<p class="aendring-meta">' +
        escapeHtml(data.firmName) +
        ' · ' +
        escapeHtml(data.jobLabel) +
        '</p>' +
        '<div class="desc-box"><p class="label">Beskrivelse</p><p>' +
        escapeHtml(order.description) +
        '</p></div>' +
        '<div class="price-box">' +
        '<p class="label">Pris</p>' +
        '<p class="big">' +
        formatDkk(order.amountDkk) +
        ' ekskl. moms</p>' +
        '<p class="total">' +
        formatDkk(total) +
        ' i alt (inkl. moms)</p>' +
        '</div>' +
        statusBlock +
        '<div id="kunde-toast-slot"></div>' +
        actions +
        '<p class="legal-note">Dette er en kommerciel godkendelse af merarbejde og pris — ikke et juridisk dokument. Du behøver ikke oprette en konto for at svare.</p>' +
        '</div>';

      var approve = document.getElementById('btn-approve');
      var reject = document.getElementById('btn-reject');
      if (approve) {
        approve.addEventListener('click', function () {
          decide('approved');
        });
      }
      if (reject) {
        reject.addEventListener('click', function () {
          decide('rejected');
        });
      }
    }

    function decide(decision) {
      data = load();
      var idx = data.orders.findIndex(function (o) {
        return o.id === order.id;
      });
      if (idx < 0) return;
      if (data.orders[idx].status !== 'pending') {
        toast(toastEl, 'Aftalen er allerede behandlet', 'info');
        renderOrder();
        return;
      }
      data.orders[idx].status = decision;
      data.orders[idx].decidedAt = Date.now();
      save(data);
      order = data.orders[idx];
      renderOrder();
    }

    renderOrder();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-aendring');
    if (page === 'firma') initFirma();
    if (page === 'kunde') initKunde();
  });
})();
