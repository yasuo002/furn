// Karar kuralları: UYGUN / KOŞULLU / ELENEN / VERİ EKSİK
export function decide(product, analysis, settings) {
  const reasons = [];
  const eb = product.ebay || {}; const st = eb.stats || {}; const risk = product.risk || {}; const ov = product.overrides || {};
  const minMargin = Number(settings.minMarginPct ?? 15);
  const minSold = Number(settings.demandMinSold90 ?? 5);
  const minSellers = Number(settings.demandMinSellers ?? 2);

  if (product.status === 'pending' || product.status === 'amazon_done') return { decision: 'missing', label: 'Beklemede', reasons: ['Araştırma henüz tamamlanmadı'] };
  if (product.status === 'error' || product.status === 'blocked' || eb.access === 'blocked' || eb.access === 'error' || eb.access === 'unverified' || (product.amazon && (product.amazon.access === 'blocked' || product.amazon.access === 'unverified'))) {
    return { decision: 'missing', label: 'Veri eksik', reasons: [product.error || eb.note || 'Erişim sorunu — talep yok anlamına gelmez; yeniden kontrol edin'] };
  }
  if (risk.flagged) return { decision: 'rejected', label: 'Elenen', reasons: risk.reasons.map(r => `Risk: ${r}`) };

  const verdict = ov.matchVerdict || (eb.matchSummary && eb.matchSummary.verdict) || 'none';
  if (verdict === 'mismatch') return { decision: 'rejected', label: 'Elenen', reasons: ['eBay eşleşmesi yanlış (birebir eşleşen ilan yok)'] };

  // Talep
  const sold90 = st.exactSold90 ?? 0;
  const sellers = st.distinctSellers; // null → doğrulanamadı
  const dataThin = !!st.coveragePartial;
  let demandOk = false, demandConditional = false;
  if (verdict === 'none') {
    if ((eb.sold?.itemsExamined ?? 0) === 0 && eb.access === 'ok') return { decision: 'rejected', label: 'Elenen', reasons: ['eBay Sold Items aramasında eşleşen satış bulunamadı (doğrulanmış talep yetersizliği)'] };
    reasons.push('Birebir eşleşen satılmış ilan yok');
  }
  if (sold90 >= minSold && sellers != null && sellers >= minSellers) demandOk = true;
  else if (sold90 >= minSold && sellers == null) { demandConditional = true; reasons.push('Satıcı sayısı eBay sonuçlarından doğrulanamadı'); }
  else if (sold90 < minSold) {
    if (dataThin) { demandConditional = true; reasons.push(`Son 90 günde ${sold90} birebir satış bulundu; ancak sonuç kapsamı eksik (veri eksik olabilir)`); }
    else if (verdict !== 'none') {
      const uncertain = st.uncertainSold90 ?? 0;
      if (uncertain > 0) { demandConditional = true; reasons.push(`Birebir ${sold90}, belirsiz ${uncertain} satış — eşleşmeler incelenmeli`); }
      else return { decision: 'rejected', label: 'Elenen', reasons: [`Talep yetersiz: son 90 günde ${sold90} birebir satış (eşik ${minSold})`] };
    } else if (!dataThin) return { decision: 'rejected', label: 'Elenen', reasons: [`Talep yetersiz: birebir eşleşen satış yok`] };
  } else if (sellers != null && sellers < minSellers) { demandConditional = true; reasons.push(`Farklı satıcı sayısı ${sellers} (eşik ${minSellers})`); }

  // Marj
  const cons = analysis.selected.conservative; const base = analysis.selected.base;
  if (!cons.ok && !base.ok) {
    reasons.push(...(cons.missing || []).map(m => `Eksik: ${m}`));
    return { decision: 'conditional', label: 'Koşullu', reasons: [...new Set(reasons)] };
  }
  const consOk = cons.ok && cons.marginPct != null && cons.marginPct >= minMargin;
  const baseOk = base.ok && base.marginPct != null && base.marginPct >= minMargin;
  if (!consOk && !baseOk) {
    const msg = `Marj eşik altında: temkinli %${cons.ok ? cons.marginPct : '—'}, baz %${base.ok ? base.marginPct : '—'} (eşik %${minMargin})`;
    if (analysis.estimated.length) return { decision: 'conditional', label: 'Koşullu', reasons: [msg, 'Tahmini maliyetlerle hesaplandı; doğrulanmış girdilerle yeniden değerlendirin', ...reasons] };
    return { decision: 'rejected', label: 'Elenen', reasons: [msg, ...reasons] };
  }
  if (!consOk && baseOk) reasons.push(`Yalnızca baz fiyatla yeterli marj (temkinli %${cons.ok ? cons.marginPct : '—'})`);
  if (verdict === 'uncertain') reasons.push('Eşleşme belirsiz — kullanıcı incelemesi gerekli');
  if (product.amazon?.conditionalPrice && product.amazon?.price == null) reasons.push('Yalnızca koşullu (kupon/abonelik) fiyat var');
  if (analysis.estimated.length) reasons.push(...analysis.estimated.map(e => `Tahmini: ${e}`));
  if (analysis.missingInfo.length) reasons.push(...analysis.missingInfo.map(e => `Eksik: ${e}`));
  if (analysis.competitionWarning) reasons.push(analysis.competitionWarning);

  const eligible = consOk && demandOk && verdict === 'exact' && analysis.estimated.length === 0 && analysis.missingInfo.length === 0 && !demandConditional;
  if (eligible) return { decision: 'eligible', label: 'Uygun', reasons: analysis.competitionWarning ? [analysis.competitionWarning] : ['Birebir eşleşme, yeterli talep, doğrulanmış maliyetler ve temkinli fiyatla yeterli marj'] };
  return { decision: 'conditional', label: 'Koşullu', reasons: [...new Set(reasons)] };
}
