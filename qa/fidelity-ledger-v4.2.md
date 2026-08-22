# v4.2 fidelity / feature ledger

- Existing cream/green Mullimulli visual system: preserved.
- Send workspace hierarchy (recipient → message → courier → delivery summary): preserved.
- New incoming-letter state: inserted as a narrow highlighted journey banner, not a new dashboard/card grid.
- Incoming information: sender, courier, D-Day, remaining time and exact arrival date; body stays sealed.
- Desktop: incoming banner sits between hero and send workspace; nav has a numeric badge.
- Mobile: incoming banner collapses to two columns and actions wrap below; existing bottom navigation remains.
- Production account semantics: GitHub Pages build has a concrete Worker API URL and public-site local fallback is blocked.
- Intentional limitation: browser Notification works while the page is open; true background Web Push is not included.
