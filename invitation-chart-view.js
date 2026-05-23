const _SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * renderInvitationChart — builds and inserts a weekly-invitations bar chart.
 *
 * Pure DOM builder: no state, no side-effects beyond writing to `container`.
 *
 * @param {HTMLElement} container Element that receives the SVG (cleared first).
 * @param {string[]} weeks Ordered Monday week-key strings (oldest → newest).
 * @param {number[]} sentCounts Sent invitation counts matching each week.
 * @param {number[]} withdrawnCounts Withdrawn counts matching each week.
 */
function renderInvitationChart(container, weeks, sentCounts, withdrawnCounts) {
    container.innerHTML = '';
    const yAxis = _computeYAxis(Math.max(...sentCounts, ...withdrawnCounts, 1));
    const layout = _computeChartLayout(weeks.length);
    const svg = _createChartSvg(layout);
    _drawGridlines(svg, layout, yAxis);
    _drawBars(svg, layout, yAxis, weeks, sentCounts, withdrawnCounts);
    _drawLegend(svg, layout);
    
    container.appendChild(svg);
}

/** @returns {{ niceMax: number, yTickValues: number[] }} */
function _computeYAxis(maxCount) {
    let tickInterval = 1;
    if (maxCount > 50) 
        tickInterval = 20;
    else if (maxCount > 20) 
        tickInterval = 10;
    else if (maxCount > 10) 
        tickInterval = 5;
    else if (maxCount > 5) 
        tickInterval = 2;

    const niceMax = Math.ceil(maxCount / tickInterval) * tickInterval;
    const yTickValues = [];
    for (let v = 0; v <= niceMax; v += tickInterval) 
        yTickValues.push(v);
    
    return { niceMax, yTickValues };
}

/**
 * @param {number} weekCount
 * @returns {{ W, H, mL, mR, mT, mB, cW, cH, bGroupW, bW, bGap, bPad }}
 */
function _computeChartLayout(weekCount) {
    const W = 410, H = 170;
    const mL = 28, mR = 8, mT = 20, mB = 44;
    const cW = W - mL - mR;
    const cH = H - mT - mB;
    const bGroupW = cW / weekCount;
    const bW = Math.floor(bGroupW * 0.38);
    const bGap = 2;
    const bPad = Math.floor((bGroupW - bW * 2 - bGap) / 2);

    return { W, H, mL, mT, cW, cH, bGroupW, bW, bGap, bPad };
}

/** @returns {SVGSVGElement} */
function _createChartSvg({ W, H }) {
    const svg = document.createElementNS(_SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', H);
    
    return svg;
}

function _drawGridlines(svg, { mL, mT, cW, cH }, { niceMax, yTickValues }) {
    for (const val of yTickValues) {
        const y = mT + cH - (val / niceMax) * cH;

        const gl = document.createElementNS(_SVG_NS, 'line');
        gl.setAttribute('x1', mL); gl.setAttribute('x2', mL + cW);
        gl.setAttribute('y1', y); gl.setAttribute('y2', y);
        gl.setAttribute('stroke', val === 0 ? '#ccc' : '#eee');
        gl.setAttribute('stroke-width', '1');
        svg.appendChild(gl);

        const tl = document.createElementNS(_SVG_NS, 'text');
        tl.setAttribute('x', mL - 4);
        tl.setAttribute('y', y + 4);
        tl.setAttribute('text-anchor', 'end');
        tl.setAttribute('font-size', '9');
        tl.setAttribute('fill', '#aaa');
        tl.textContent = val;
        svg.appendChild(tl);
    }
}

// current week = last entry = rightmost bar group
function _drawBars(svg, { mL, mT, cH, bGroupW, bW, bGap, bPad }, { niceMax }, weeks, sentCounts, withdrawnCounts) {
    weeks.forEach((key, idx) => {
        const isCurrent = idx === weeks.length - 1;
        const groupX = mL + idx * bGroupW;
        const sentX = groupX + bPad;
        const withdrawnX = sentX + bW + bGap;

        _drawBar(svg, sentX, sentCounts[idx], 'sent',
            isCurrent ? '#0a66c2' : '#93bfe8',
            isCurrent ? '#0a66c2' : '#5a8fc0',
            { bW, mT, cH }, niceMax);

        _drawBar(svg, withdrawnX, withdrawnCounts[idx], 'withdrawn',
            isCurrent ? '#e85d04' : '#f4a261',
            isCurrent ? '#e85d04' : '#c47a3a',
            { bW, mT, cH }, niceMax);

        const monday = new Date(key + 'T00:00:00Z');
        const xl = document.createElementNS(_SVG_NS, 'text');
        xl.setAttribute('x', groupX + bGroupW / 2);
        xl.setAttribute('y', mT + cH + 13);
        xl.setAttribute('text-anchor', 'middle');
        xl.setAttribute('font-size', '9');
        xl.setAttribute('fill', isCurrent ? '#0a66c2' : '#999');
        xl.setAttribute('font-weight', isCurrent ? '700' : '400');
        xl.textContent = `${monday.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })} ${monday.getUTCDate()}`;
        svg.appendChild(xl);
    });
}

function _drawBar(svg, x, count, barType, barFill, labelFill, { bW, mT, cH }, niceMax) {
    const barH = Math.max((count / niceMax) * cH, count > 0 ? 2 : 0);
    const barY = mT + cH - barH;

    const rect = document.createElementNS(_SVG_NS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', barY);
    rect.setAttribute('width', bW);
    rect.setAttribute('height', barH);
    rect.setAttribute('rx', '3');
    rect.setAttribute('fill', barFill);
    rect.setAttribute('data-bar', barType);
    svg.appendChild(rect);

    if (count > 0) {
        const lbl = document.createElementNS(_SVG_NS, 'text');
        lbl.setAttribute('x', x + bW / 2);
        lbl.setAttribute('y', barY - 4);
        lbl.setAttribute('text-anchor', 'middle');
        lbl.setAttribute('font-size', '10');
        lbl.setAttribute('font-weight', '700');
        lbl.setAttribute('fill', labelFill);
        lbl.textContent = count;
        svg.appendChild(lbl);
    }
}

function _drawLegend(svg, { W, mT, cH }) {
    const legendY = mT + cH + 30;
    const boxSize = 8;
    const gap = 4;
    // Approximate widths: "Sent" ≈20px, "Withdrawn" ≈45px at font-size 9
    const item1W = boxSize + gap + 20;
    const item2W = boxSize + gap + 48;
    const itemSpacing = 12;
    const totalW = item1W + itemSpacing + item2W;
    const startX = (W - totalW) / 2;

    const items = [
        { label: 'Sent',      fill: '#0a66c2', x: startX },
        { label: 'Withdrawn', fill: '#e85d04', x: startX + item1W + itemSpacing },
    ];

    for (const item of items) {
        const box = document.createElementNS(_SVG_NS, 'rect');
        box.setAttribute('x', item.x);
        box.setAttribute('y', legendY - boxSize);
        box.setAttribute('width', boxSize);
        box.setAttribute('height', boxSize);
        box.setAttribute('rx', '2');
        box.setAttribute('fill', item.fill);
        svg.appendChild(box);

        const txt = document.createElementNS(_SVG_NS, 'text');
        txt.setAttribute('x', item.x + boxSize + gap);
        txt.setAttribute('y', legendY);
        txt.setAttribute('font-size', '9');
        txt.setAttribute('fill', '#666');
        txt.textContent = item.label;
        svg.appendChild(txt);
    }
}
