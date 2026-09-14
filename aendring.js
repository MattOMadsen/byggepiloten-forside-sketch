/**
 * Client-only Ændringsaftale demo (PR #36 UX mock).
 * Multi-line ekstraarbejde package + one customer approve.
 * No live API — state in localStorage.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'bp-sketch-aendring-v2';
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
    return v.toLocaleString('da-DK') + '\u00a0kr.';
  }

  function normalizeOrder(o) {
    if (!o || typeof o !== 'object') return null;
    var lines = Array.isArray(o.lines) ? o.lines.slice() : null;
    if (!lines || !lines.length) {
      if (o.description != null || o.amountDkk != null) {
        lines = [
          {
            description: String(o.description || ''),
            amountDkk: Math.round(Number(o.amountDkk) || 0),
          },
        ];
      } else {
        lines = [];
      }
    }
    lines = lines
      .map(function (l) {
        return {
          description: String((l && l.description) || '').trim(),
          amountDkk: Math.round(Number((l && l.amountDkk) || 0)),
        };
      })
      .filter(function (l) {
        return l.description || l.amountDkk > 0;
      });
    var amountDkk = lines.reduce(function (sum, l) {
      return sum + (l.amountDkk || 0);
    }, 0);
    var description =
      lines.length === 0
        ? ''
        : lines.length === 1
          ? lines[0].description
          : lines.length + ' poster: ' + lines[0].description;
    return {
      id: o.id,
      lines: lines,
      description: description,
      amountDkk: amountDkk,
      status: o.status || 'pending',
      createdAt: o.createdAt || Date.now(),
      decidedAt: o.decidedAt,
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // migrate v1 if present
        var legacy = localStorage.getItem('bp-sketch-aendring-v1');
        if (legacy) {
          var old = JSON.parse(legacy);
          if (old && Array.isArray(old.orders)) {
            var migrated = {
              firmName: old.firmName || DEMO_FIRM,
              jobLabel: old.jobLabel || DEMO_JOB,
              orders: old.orders.map(normalizeOrder).filter(Boolean),
            };
            save(migrated);
            return migrated;
          }
        }
        return seed();
      }
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.orders)) return seed();
      data.orders = data.orders.map(normalizeOrder).filter(Boolean);
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
        normalizeOrder({
          id: 'demo-1',
          lines: [
            {
              description: 'Ekstra stikkontakt i køkken, 2 timer',
              amountDkk: 1800,
            },
            {
              description: 'Opgradering til vådrumsmembran i niche',
              amountDkk: 2400,
            },
          ],
          status: 'pending',
          createdAt: Date.now() - 3600 * 1000,
        }),
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

  function sumLines(lines) {
    return (lines || []).reduce(function (s, l) {
      return s + (Math.round(Number(l.amountDkk) || 0));
    }, 0);
  }

  /* —— Firm page —— */
  function initFirma() {
    var data = load();
    var form = document.getElementById('aendring-form');
    var list = document.getElementById('order-list');
    var toastEl = document.getElementById('firma-toast');
    var draftMsg = document.getElementById('tillags-msg');
    var jobChip = document.getElementById('job-chip');
    var linesHost = document.getElementById('line-items');
    var runningEl = document.getElementById('running-total');
    var formError = document.getElementById('co-form-error');
    var lineSeq = 0;

    if (jobChip) {
      jobChip.innerHTML =
        '<strong>' +
        escapeHtml(data.firmName) +
        '</strong> · ' +
        escapeHtml(data.jobLabel);
    }

    function updateRunningTotal() {
      if (!runningEl || !linesHost) return;
      var total = 0;
      var inputs = linesHost.querySelectorAll('[data-line-amount]');
      for (var i = 0; i < inputs.length; i++) {
        var p = parseAmount(inputs[i].value);
        if (p != null) total += p;
      }
      runningEl.innerHTML =
        'I alt: <strong>' + formatDkk(total) + '</strong> ekskl. moms';
    }

    function syncRemoveButtons() {
      if (!linesHost) return;
      var rows = linesHost.querySelectorAll('.line-row');
      var onlyOne = rows.length <= 1;
      for (var i = 0; i < rows.length; i++) {
        var btn = rows[i].querySelector('[data-remove-line]');
        if (btn) btn.disabled = onlyOne;
      }
    }

    function addLineRow(preset) {
      if (!linesHost) return;
      lineSeq += 1;
      var id = 'line-' + lineSeq;
      var row = document.createElement('div');
      row.className = 'line-row';
      row.dataset.lineId = id;
      row.innerHTML =
        '<div class="line-row__desc">' +
        '<label for="' +
        id +
        '-desc">Beskrivelse</label>' +
        '<textarea id="' +
        id +
        '-desc" rows="2" data-line-desc placeholder="Fx ekstra stikkontakt i køkken, 2 timer" required></textarea>' +
        '</div>' +
        '<div class="line-row__amt">' +
        '<label for="' +
        id +
        '-amt">Beløb (ekskl. moms)</label>' +
        '<input id="' +
        id +
        '-amt" type="text" inputmode="decimal" data-line-amount placeholder="1800" required />' +
        '</div>' +
        '<button type="button" class="btn btn--sm btn--ghost line-row__remove" data-remove-line aria-label="Fjern linje">Fjern</button>';
      linesHost.appendChild(row);
      if (preset) {
        var ta = row.querySelector('[data-line-desc]');
        var inp = row.querySelector('[data-line-amount]');
        if (ta && preset.description) ta.value = preset.description;
        if (inp && preset.amountDkk != null) inp.value = String(preset.amountDkk);
      }
      syncRemoveButtons();
      updateRunningTotal();
    }

    function resetLines() {
      if (!linesHost) return;
      linesHost.innerHTML = '';
      lineSeq = 0;
      addLineRow();
    }

    if (linesHost) {
      resetLines();
      linesHost.addEventListener('input', function (ev) {
        if (ev.target.matches('[data-line-amount], [data-line-desc]')) {
          updateRunningTotal();
        }
      });
      linesHost.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-remove-line]');
        if (!btn || btn.disabled) return;
        var row = btn.closest('.line-row');
        if (row) row.remove();
        syncRemoveButtons();
        updateRunningTotal();
      });
    }

    var addBtn = document.getElementById('add-line');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        addLineRow();
        var last = linesHost && linesHost.querySelector('.line-row:last-child [data-line-desc]');
        if (last) last.focus();
      });
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
          var linesHtml = '';
          if (o.lines && o.lines.length) {
            linesHtml =
              '<ul class="order-item__lines">' +
              o.lines
                .map(function (l) {
                  return (
                    '<li><span>' +
                    escapeHtml(l.description) +
                    '</span><span class="amt">' +
                    formatDkk(l.amountDkk) +
                    '</span></li>'
                  );
                })
                .join('') +
              '</ul>' +
              '<p class="order-item__count">' +
              o.lines.length +
              (o.lines.length === 1 ? ' linje' : ' linjer') +
              '</p>';
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
            linesHtml +
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
        if (formError) formError.textContent = '';
        if (!linesHost) return;
        var rows = linesHost.querySelectorAll('.line-row');
        var collected = [];
        var err = '';
        for (var i = 0; i < rows.length; i++) {
          var descEl = rows[i].querySelector('[data-line-desc]');
          var amtEl = rows[i].querySelector('[data-line-amount]');
          var desc = (descEl.value || '').trim().replace(/\s+/g, ' ');
          var parsed = parseAmount(amtEl.value);
          if (!desc && !String(amtEl.value || '').trim()) continue;
          if (!desc) {
            err = 'Udfyld beskrivelse på alle linjer med beløb';
            break;
          }
          if (parsed == null) {
            err = 'Angiv beløb i hele kr. (min. 1) på hver linje';
            break;
          }
          collected.push({
            description: desc.slice(0, 2000),
            amountDkk: parsed,
          });
        }
        if (err) {
          if (formError) formError.textContent = err;
          toast(toastEl, err, 'err');
          return;
        }
        if (!collected.length) {
          err = 'Tilføj mindst én linje med beskrivelse og beløb';
          if (formError) formError.textContent = err;
          toast(toastEl, err, 'err');
          return;
        }
        data = load();
        var order = normalizeOrder({
          id: 'demo-' + Date.now().toString(36),
          lines: collected,
          status: 'pending',
          createdAt: Date.now(),
        });
        data.orders.push(order);
        save(data);
        resetLines();
        toast(
          toastEl,
          'Sendt til godkendelse — kunden godkender alle ' +
            collected.length +
            (collected.length === 1 ? ' linje' : ' linjer') +
            ' via ét link (demo)',
          'ok'
        );
        var panel = document.getElementById('create-panel');
        if (panel) panel.hidden = true;
        var toggle = document.getElementById('toggle-create');
        if (toggle) {
          toggle.textContent = 'Ændringsaftale';
          toggle.classList.add('btn--primary');
          toggle.classList.remove('btn--ghost');
        }
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
        if (open && linesHost && !linesHost.children.length) resetLines();
      });
    }

    var resetBtn = document.getElementById('reset-demo');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('bp-sketch-aendring-v1');
        seed();
        clearToast(toastEl);
        resetLines();
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
      order = normalizeOrder(order);

      var pending = order.status === 'pending';
      var ex = sumLines(order.lines);
      var total = customerTotal(ex);
      var statusBlock = '';
      if (!pending) {
        statusBlock =
          '<p class="status-pill status-pill--' +
          (order.status === 'approved' ? 'ok' : 'bad') +
          '">' +
          (order.status === 'approved' ? '✓ ' : '✕ ') +
          STATUS_LABEL[order.status] +
          (order.status === 'approved'
            ? ' — firmaet opretter tillægsfaktura ud fra denne aftale.'
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

      var linesBlock =
        '<p class="desc-box" style="padding:0.65rem 0.85rem;margin-bottom:0.35rem">' +
        '<span class="label" style="display:block">Ekstraarbejde (' +
        order.lines.length +
        (order.lines.length === 1 ? ' linje' : ' linjer') +
        ')</span></p>' +
        '<ul class="pakke-lines">' +
        order.lines
          .map(function (l) {
            return (
              '<li class="pakke-line">' +
              '<p class="pakke-line__desc">' +
              escapeHtml(l.description) +
              '</p>' +
              '<p class="pakke-line__amt">' +
              formatDkk(l.amountDkk) +
              '</p>' +
              '</li>'
            );
          })
          .join('') +
        '</ul>';

      root.innerHTML =
        '<div class="aendring-card">' +
        '<p class="aendring-kicker">Ændringsaftale</p>' +
        '<h1>Ekstraarbejde til godkendelse</h1>' +
        '<p class="aendring-meta">' +
        escapeHtml(data.firmName) +
        ' · ' +
        escapeHtml(data.jobLabel) +
        '</p>' +
        linesBlock +
        '<div class="price-box">' +
        '<p class="label">I alt</p>' +
        '<p class="big">' +
        formatDkk(ex) +
        ' ekskl. moms</p>' +
        '<p class="total">' +
        formatDkk(total) +
        ' i alt (inkl. moms)</p>' +
        '</div>' +
        statusBlock +
        '<div id="kunde-toast-slot"></div>' +
        actions +
        '<p class="legal-note">Dette er en kommerciel godkendelse af merarbejde og pris for alle linjer — ikke et juridisk dokument. Du behøver ikke oprette en konto for at svare.</p>' +
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
