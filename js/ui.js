// ui.js
// Common UI functions and DOM manipulations

const UI = {
    // Show user avatar in navbar if logged in
    async initAuthUI() {
        const userElement = document.getElementById('nav-user');
        if (!userElement) return;

        // Ensure DB is initialized
        if(typeof DB !== 'undefined') {
            const user = await DB.getUser();
            if (user) {
                userElement.innerHTML = `
                    <div class="avatar">${user.email.charAt(0).toUpperCase()}</div>
                    <span class="text-secondary">${user.email.split('@')[0]}</span>
                    <button class="btn btn-ghost" style="padding: 5px 10px; font-size: 0.8rem;" id="btn-logout">Logout</button>
                `;
                document.getElementById('btn-logout').addEventListener('click', async () => {
                    await DB.signOut();
                    window.location.reload();
                });
            } else {
                 userElement.innerHTML = `<a href="login.html" class="btn btn-primary" style="padding: 5px 15px;">Login</a>`;
            }
        }
    },

    // Render Metric Cards
    renderKPICards(containerId, results, isBaseline = false) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        for (const key in results.final) {
            const config = MetricsConfig[key];
            const finalVal = results.final[key];
            const baseVal = results.baseline[key];
            
            let displayVal = finalVal.toFixed(1);
            if(finalVal > 1000) displayVal = Math.round(finalVal);
            
            let changeHtml = '';
            if (!isBaseline) {
                const diff = finalVal - baseVal;
                const pDiff = (diff / baseVal) * 100;
                
                let isGood = false;
                if (diff === 0) {
                    changeHtml = `<span class="metric-change neutral">0%</span>`;
                } else {
                    if (config.goodDirection === 'down' && diff < 0) isGood = true;
                    if (config.goodDirection === 'up' && diff > 0) isGood = true;
                    
                    const sign = diff > 0 ? '+' : '';
                    const colorClass = isGood ? 'positive' : 'negative';
                    changeHtml = `<span class="metric-change ${colorClass}">${sign}${pDiff.toFixed(1)}% vs baseline</span>`;
                }
            } else {
                 changeHtml = `<span class="metric-change neutral">Baseline value</span>`;
            }

            container.innerHTML += `
               <div class="kpi-card">
                  <div class="metric-header">${config.icon} ${config.label}</div>
                  <div class="metric-value">${displayVal} <span style="font-size:0.5em;color:var(--text-secondary)">${config.unit}</span></div>
                  ${changeHtml}
               </div>
            `;
        }
    },

    // Generate Dynamic Sliders based on Policy Config
    renderPolicySliders(containerId, activeModule, currentParams) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        const config = PoliciesConfig[activeModule].params;
        const state = currentParams[activeModule];

        for (const key in config) {
            const p = config[key];
            const val = state[key];
            
            const group = document.createElement('div');
            group.className = p.type === 'toggle' ? 'toggle-switch' : 'input-group';
            
            if (p.type === 'range') {
                group.innerHTML = `
                    <label>${p.label} <span class="val-display" id="val-${key}">${val}</span></label>
                    <input type="range" id="input-${key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">
                `;
            } else if (p.type === 'select') {
                const optionsHtml = p.options.map(o => `<option value="${o}" ${o==val?'selected':''}>${o}</option>`).join('');
                group.innerHTML = `
                    <label>${p.label}</label>
                    <select id="input-${key}">${optionsHtml}</select>
                `;
            } else if (p.type === 'number') {
                group.innerHTML = `
                    <label>${p.label}</label>
                    <input type="number" id="input-${key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${val}">
                `;
            } else if (p.type === 'toggle') {
                group.innerHTML = `
                    <label>${p.label}</label>
                    <label class="switch">
                        <input type="checkbox" id="input-${key}" ${val ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                `;
            }
            container.appendChild(group);

            // Add listener
            const input = document.getElementById(`input-${key}`);
            if (input) {
                input.addEventListener('input', (e) => {
                    let newVal = p.type === 'toggle' ? e.target.checked : e.target.value;
                    if(p.type === 'number' || p.type === 'range') newVal = Number(newVal);
                    state[key] = newVal;
                    const valDisplay = document.getElementById(`val-${key}`);
                    if(valDisplay) valDisplay.innerText = newVal;
                });
            }
        }
    },

    // Simple Tab Manager
    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.getAttribute('data-target');
                if(!target) return;
                
                // remove active class from siblings
                const parent = e.target.parentElement;
                parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                
                // add active class
                e.target.classList.add('active');
                
                // hide all contents
                const wrapper = parent.nextElementSibling;
                if(wrapper && wrapper.classList.contains('tab-content-wrapper')) {
                   wrapper.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                   const content = document.getElementById(target);
                   if(content) content.classList.add('active');
                } else {
                   // global fallback
                   document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                   const content = document.getElementById(target);
                   if(content) content.classList.add('active');
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    UI.initAuthUI();
    UI.setupTabs();
});
