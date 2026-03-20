/**
 * SDS HTML 模板 — 严格还原 US SDS Word 模板格式
 * Times New Roman 字体，US Letter 页面，标准边距
 */

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\n/g, '<br>')
}

/**
 * 将多行文本渲染为段落（每行一个 <p>）
 */
function renderLines(text) {
  if (!text) return '<p>Not available</p>'
  return text.split('\n').filter(l => l.trim()).map(l => `<p>${escapeHtml(l)}</p>`).join('')
}

/**
 * 渲染 Section 标题行（全宽黑底白字）
 */
function renderSectionHeader(num, title_en) {
  return `
  <tr>
    <td colspan="2" class="section-header">
      SECTION ${num}: ${title_en.toUpperCase()}
    </td>
  </tr>`
}

/**
 * 渲染普通字段行（label | value）
 */
function renderFieldRow(label, value, fullWidth = false) {
  const val = value ? escapeHtml(value) : '<span class="na">Not available</span>'
  if (fullWidth) {
    return `
    <tr>
      <td class="field-label" colspan="2">
        <div class="label">${escapeHtml(label)}:</div>
        <div class="value">${val.replace(/&lt;br&gt;/g, '<br>')}</div>
      </td>
    </tr>`
  }
  return `
    <tr>
      <td class="field-label"><strong>${escapeHtml(label)}:</strong></td>
      <td class="field-value">${val.replace(/&lt;br&gt;/g, '<br>')}</div></td>
    </tr>`
}

/**
 * 渲染成分表 Section 3（4 列数据表）
 */
function renderIngredientsTable(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return `
    <tr>
      <td colspan="2">
        <table class="ingredients-table">
          <thead>
            <tr>
              <th>Chemical Name</th>
              <th>CAS Number</th>
              <th>Concentration (%)</th>
              <th>Trade Secret</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4">No ingredients listed</td></tr>
          </tbody>
        </table>
      </td>
    </tr>`
  }

  const rows = ingredients.map(ing => `
    <tr>
      <td>${escapeHtml(ing.chemical_name || '')}</td>
      <td>${escapeHtml(ing.cas_number || '')}</td>
      <td>${escapeHtml(ing.concentration || '')}</td>
      <td>*</td>
    </tr>`).join('')

  return `
    <tr>
      <td colspan="2">
        <table class="ingredients-table">
          <thead>
            <tr>
              <th>Chemical Name</th>
              <th>CAS Number</th>
              <th>Concentration (%)</th>
              <th>Trade Secret</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="footnote">* Trade secret is claimed for this ingredient. The identity is withheld as a trade secret.</p>
      </td>
    </tr>`
}

/**
 * 生成完整 SDS HTML 文档
 * @param {Object} data - SDS 字段数据
 * @returns {string} 完整 HTML 字符串
 */
function generateSdsHtml(data) {
  const d = data || {}

  // 格式化日期
  const today = new Date()
  const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`
  const issueDate = d.issue_date || todayStr
  const revisionDate = d.revision_date || todayStr
  const revisionNumber = d.revision_number || '1.0'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Safety Data Sheet — ${escapeHtml(d.product_name || 'Product')}</title>
<style>
  /* ── Reset & Base ───────────────────────── */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    background: #fff;
  }

  /* ── Page Layout (for screen preview) ──── */
  .page {
    width: 8.5in;
    min-height: 11in;
    margin: 0 auto;
    padding: 1in;
    background: #fff;
  }

  /* ── Page Header ──────────────────────────��� */
  .page-header {
    border-bottom: 2px solid #000;
    padding-bottom: 6pt;
    margin-bottom: 6pt;
  }

  .header-title {
    font-size: 22pt;
    font-weight: bold;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 2pt;
    margin-bottom: 4pt;
  }

  .header-product-name {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 4pt;
  }

  .header-info {
    font-size: 9pt;
    display: flex;
    justify-content: space-between;
  }

  /* ── SDS Table ───────────────────────────── */
  .sds-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6pt;
  }

  .sds-table td, .sds-table th {
    border: 1px solid #000;
    padding: 4pt 6pt;
    vertical-align: top;
    font-size: 11pt;
  }

  /* Section header: black background, white text */
  .section-header {
    background-color: #000;
    color: #fff;
    font-weight: bold;
    font-size: 11pt;
    padding: 4pt 6pt;
    text-transform: uppercase;
  }

  /* Field label column */
  .field-label {
    width: 35%;
    font-weight: bold;
    background-color: #f0f0f0;
    vertical-align: top;
  }

  /* Field value column */
  .field-value {
    width: 65%;
    vertical-align: top;
  }

  /* Full-width value rows */
  .full-row .label {
    font-weight: bold;
    margin-bottom: 2pt;
  }

  .na {
    color: #666;
    font-style: italic;
  }

  /* ── Ingredients Table ───────────────────── */
  .ingredients-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 2pt;
  }

  .ingredients-table th {
    background-color: #d0d0d0;
    border: 1px solid #000;
    padding: 3pt 5pt;
    text-align: left;
    font-size: 10pt;
    font-weight: bold;
  }

  .ingredients-table td {
    border: 1px solid #000;
    padding: 3pt 5pt;
    font-size: 10pt;
  }

  .footnote {
    font-size: 9pt;
    margin-top: 3pt;
    font-style: italic;
  }

  /* ── Page Footer ─────────────────────────── */
  .page-footer {
    border-top: 1px solid #000;
    margin-top: 12pt;
    padding-top: 4pt;
    font-size: 9pt;
    display: flex;
    justify-content: space-between;
  }

  /* ── Print styles ──────────────────────── */
  @page {
    size: letter;
    margin: 1in;
  }

  @media print {
    .page {
      width: 100%;
      padding: 0;
      margin: 0;
    }

    .page-header, .page-footer {
      position: fixed;
    }

    .page-header {
      top: 0;
    }

    .page-footer {
      bottom: 0;
    }
  }

  p {
    margin-bottom: 2pt;
  }
</style>
</head>
<body>
<div class="page">

  <!-- ── Page Header ── -->
  <div class="page-header">
    <div class="header-title">Safety Data Sheet</div>
    <div class="header-product-name">${escapeHtml(d.product_name || '')}</div>
    <div class="header-info">
      <span>${escapeHtml(d.company_name || '')}</span>
      <span>Issue Date: ${escapeHtml(issueDate)} &nbsp;|&nbsp; Revision: ${escapeHtml(revisionDate)} v${escapeHtml(revisionNumber)}</span>
    </div>
  </div>

  <!-- ── SDS Table ── -->
  <table class="sds-table">

    <!-- ═══ SECTION 1: Identification ═══ -->
    ${renderSectionHeader(1, 'Identification')}
    ${renderFieldRow('Product Name', d.product_name)}
    ${renderFieldRow('Product Code', d.product_code)}
    ${renderFieldRow('Recommended Use', d.recommended_use)}
    ${renderFieldRow('Restrictions on Use', d.restrictions_on_use)}
    ${renderFieldRow('Supplier/Company Name', d.company_name)}
    ${renderFieldRow('Address', d.company_address)}
    ${renderFieldRow('Telephone', d.company_phone)}
    ${renderFieldRow('Emergency Phone', d.emergency_phone || 'CHEMTREC: +1 (800) 424-9300')}

    <!-- ═══ SECTION 2: Hazard(s) Identification ═══ -->
    ${renderSectionHeader(2, "Hazard(s) Identification")}
    ${renderFieldRow('GHS Classification', d.ghs_classification)}
    ${renderFieldRow('Signal Word', d.signal_word)}
    ${renderFieldRow('Hazard Statements', d.hazard_statements)}
    ${renderFieldRow('Precautionary Statements', d.precautionary_statements)}
    ${renderFieldRow('Other Hazards Not Classified', d.hazards_not_classified)}

    <!-- ═══ SECTION 3: Composition/Information on Ingredients ═══ -->
    ${renderSectionHeader(3, 'Composition/Information on Ingredients')}
    ${renderIngredientsTable(d.ingredients)}

    <!-- ═══ SECTION 4: First-Aid Measures ═══ -->
    ${renderSectionHeader(4, 'First-Aid Measures')}
    ${renderFieldRow('Inhalation', d.first_aid_inhalation)}
    ${renderFieldRow('Skin Contact', d.first_aid_skin)}
    ${renderFieldRow('Eye Contact', d.first_aid_eyes)}
    ${renderFieldRow('Ingestion', d.first_aid_ingestion)}
    ${renderFieldRow('Notes to Physician', d.first_aid_notes)}

    <!-- ═══ SECTION 5: Fire-Fighting Measures ═══ -->
    ${renderSectionHeader(5, 'Fire-Fighting Measures')}
    ${renderFieldRow('Suitable Extinguishing Media', d.extinguishing_media)}
    ${renderFieldRow('Unsuitable Extinguishing Media', d.extinguishing_media_not_suitable)}
    ${renderFieldRow('Specific Hazards', d.fire_hazards)}
    ${renderFieldRow('Special Protective Equipment for Fire-Fighters', d.fire_fighting_instructions)}

    <!-- ═══ SECTION 6: Accidental Release Measures ═══ -->
    ${renderSectionHeader(6, 'Accidental Release Measures')}
    ${renderFieldRow('Personal Precautions', d.personal_precautions)}
    ${renderFieldRow('Environmental Precautions', d.environmental_precautions)}
    ${renderFieldRow('Methods and Material for Containment and Clean-Up', d.containment_cleanup)}

    <!-- ═══ SECTION 7: Handling and Storage ═══ -->
    ${renderSectionHeader(7, 'Handling and Storage')}
    ${renderFieldRow('Precautions for Safe Handling', d.safe_handling)}
    ${renderFieldRow('Conditions for Safe Storage', d.storage_conditions)}
    ${renderFieldRow('Incompatible Materials', d.incompatible_materials)}

    <!-- ═══ SECTION 8: Exposure Controls/Personal Protection ═══ -->
    ${renderSectionHeader(8, 'Exposure Controls/Personal Protection')}
    ${renderFieldRow('Occupational Exposure Limits', d.exposure_limits)}
    ${renderFieldRow('Engineering Controls', d.engineering_controls)}
    ${renderFieldRow('Respiratory Protection', d.ppe_respiratory)}
    ${renderFieldRow('Hand Protection', d.ppe_hand)}
    ${renderFieldRow('Eye Protection', d.ppe_eye)}
    ${renderFieldRow('Skin and Body Protection', d.ppe_skin)}

    <!-- ═══ SECTION 9: Physical and Chemical Properties ═══ -->
    ${renderSectionHeader(9, 'Physical and Chemical Properties')}
    ${renderFieldRow('Physical State / Appearance', d.physical_appearance)}
    ${renderFieldRow('Odor', d.odor)}
    ${renderFieldRow('Odor Threshold', d.odor_threshold || 'N/A')}
    ${renderFieldRow('pH', d.ph || 'N/A')}
    ${renderFieldRow('Melting/Freezing Point', d.melting_point || 'N/A')}
    ${renderFieldRow('Boiling Point', d.boiling_point || 'N/A')}
    ${renderFieldRow('Flash Point', d.flash_point || 'N/A')}
    ${renderFieldRow('Evaporation Rate', d.evaporation_rate || 'N/A')}
    ${renderFieldRow('Flammability (solid, gas)', d.flammability || 'N/A')}
    ${renderFieldRow('Upper/Lower Flammability Limits', d.flammable_limits || 'N/A')}
    ${renderFieldRow('Vapor Pressure', d.vapor_pressure || 'N/A')}
    ${renderFieldRow('Vapor Density (air=1)', d.vapor_density || 'N/A')}
    ${renderFieldRow('Relative Density', d.relative_density || 'N/A')}
    ${renderFieldRow('Solubility in Water', d.solubility || 'N/A')}
    ${renderFieldRow('Partition Coefficient (n-octanol/water)', d.partition_coefficient || 'N/A')}
    ${renderFieldRow('Auto-Ignition Temperature', d.auto_ignition_temp || 'N/A')}
    ${renderFieldRow('Decomposition Temperature', d.decomposition_temp || 'N/A')}

    <!-- ═══ SECTION 10: Stability and Reactivity ═══ -->
    ${renderSectionHeader(10, 'Stability and Reactivity')}
    ${renderFieldRow('Reactivity', d.reactivity)}
    ${renderFieldRow('Chemical Stability', d.chemical_stability)}
    ${renderFieldRow('Possibility of Hazardous Reactions', d.hazardous_reactions)}
    ${renderFieldRow('Conditions to Avoid', d.conditions_to_avoid)}
    ${renderFieldRow('Incompatible Materials', d.incompatible_chemicals)}
    ${renderFieldRow('Hazardous Decomposition Products', d.hazardous_decomposition)}

    <!-- ═══ SECTION 11: Toxicological Information ═══ -->
    ${renderSectionHeader(11, 'Toxicological Information')}
    ${renderFieldRow('Acute Toxicity', d.acute_toxicity)}
    ${renderFieldRow('Skin Corrosion/Irritation', d.skin_irritation)}
    ${renderFieldRow('Serious Eye Damage/Eye Irritation', d.eye_irritation)}
    ${renderFieldRow('Respiratory or Skin Sensitization', d.sensitization)}
    ${renderFieldRow('Germ Cell Mutagenicity', d.mutagenicity)}
    ${renderFieldRow('Carcinogenicity', d.carcinogenicity)}
    ${renderFieldRow('Reproductive Toxicity', d.reproductive_toxicity)}
    ${renderFieldRow('STOT — Single Exposure', d.target_organ_single)}
    ${renderFieldRow('STOT — Repeated Exposure', d.target_organ_repeat)}
    ${renderFieldRow('Aspiration Hazard', d.aspiration_hazard)}

    <!-- ═══ SECTION 12: Ecological Information ═══ -->
    ${renderSectionHeader(12, 'Ecological Information')}
    ${renderFieldRow('Ecotoxicity', d.ecotoxicity)}
    ${renderFieldRow('Persistence and Degradability', d.persistence_degradability)}
    ${renderFieldRow('Bioaccumulation Potential', d.bioaccumulation)}
    ${renderFieldRow('Mobility in Soil', d.soil_mobility || 'N/A')}
    ${renderFieldRow('Other Adverse Effects', d.other_adverse_effects || 'None known')}

    <!-- ═══ SECTION 13: Disposal Considerations ═══ -->
    ${renderSectionHeader(13, 'Disposal Considerations')}
    ${renderFieldRow('Waste Disposal Methods', d.waste_disposal)}

    <!-- ═══ SECTION 14: Transport Information ═══ -->
    ${renderSectionHeader(14, 'Transport Information')}
    ${renderFieldRow('UN Number', d.un_number || 'Not regulated')}
    ${renderFieldRow('UN Proper Shipping Name', d.proper_shipping_name || 'Not regulated')}
    ${renderFieldRow('Transport Hazard Class', d.transport_hazard_class || 'Not applicable')}
    ${renderFieldRow('Packing Group', d.packing_group || 'Not applicable')}
    ${renderFieldRow('Environmental Hazards', d.environmental_hazards_transport || 'Not classified')}
    ${renderFieldRow('Special Precautions for User', d.transport_special_precautions || 'None')}
    ${renderFieldRow('Transport in Bulk', d.transport_bulk || 'Not applicable')}

    <!-- ═══ SECTION 15: Regulatory Information ═══ -->
    ${renderSectionHeader(15, 'Regulatory Information')}
    ${renderFieldRow('US Federal Regulations', d.us_federal_regulations)}
    ${renderFieldRow('State Regulations', d.state_regulations)}
    ${renderFieldRow('International Regulations', d.international_regulations)}

    <!-- ═══ SECTION 16: Other Information ═══ -->
    ${renderSectionHeader(16, 'Other Information')}
    ${renderFieldRow('Issue Date', issueDate)}
    ${renderFieldRow('Revision Date', revisionDate)}
    ${renderFieldRow('Revision Number', revisionNumber)}
    ${renderFieldRow('Prepared By', d.prepared_by || 'EHS Department')}
    ${renderFieldRow('Abbreviations and Acronyms', d.abbreviations)}
    ${renderFieldRow('Disclaimer', d.disclaimer)}

  </table>

  <!-- ── Page Footer ── -->
  <div class="page-footer">
    <span>${escapeHtml(d.company_name || '')} | ${escapeHtml(d.product_name || '')}</span>
    <span>SDS v${escapeHtml(revisionNumber)} | ${escapeHtml(revisionDate)} | Page <span class="page-number"></span></span>
  </div>

</div>
</body>
</html>`
}

module.exports = { generateSdsHtml }
