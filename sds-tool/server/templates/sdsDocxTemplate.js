/**
 * SDS Word 文档模板 — 使用 docx 库生成符合标准的 .docx 文件
 */

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  HeadingLevel,
  PageOrientation,
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} = require('docx')

const { SDS_SECTIONS } = require('../data/sdsFields')

// twip 转换
const PT = (n) => n * 20 // 1pt = 20 twip

/**
 * 创建 Section 标题行（黑底白字）
 */
function createSectionHeader(num, title_en) {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `SECTION ${num}: ${title_en.toUpperCase()}`,
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: PT(11),
              }),
            ],
          }),
        ],
        columnSpan: 2,
        shading: { type: ShadingType.SOLID, color: '000000', fill: '000000' },
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    ],
  })
}

/**
 * 创建普通字段行（label | value）
 */
function createFieldRow(label, value) {
  const val = value ? String(value) : 'Not available'

  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `${label}:`,
                bold: true,
                font: 'Times New Roman',
                size: PT(11),
              }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: 'F0F0F0', fill: 'F0F0F0' },
        width: { size: 35, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: val.split('\n').map(line =>
          new Paragraph({
            children: [
              new TextRun({
                text: line || ' ',
                font: 'Times New Roman',
                size: PT(11),
              }),
            ],
          })
        ),
        width: { size: 65, type: WidthType.PERCENTAGE },
      }),
    ],
  })
}

/**
 * 创建成分表（Section 3，4列）
 */
function createIngredientsTable(ingredients) {
  const headerRow = new TableRow({
    children: ['Chemical Name', 'CAS Number', 'Concentration (%)', 'Trade Secret'].map(h =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: h, bold: true, font: 'Times New Roman', size: PT(10) }),
            ],
          }),
        ],
        shading: { type: ShadingType.SOLID, color: 'D0D0D0', fill: 'D0D0D0' },
      })
    ),
  })

  const dataRows = (ingredients && ingredients.length > 0 ? ingredients : [{ chemical_name: '', cas_number: '', concentration: '' }])
    .map(ing =>
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ing.chemical_name || '', font: 'Times New Roman', size: PT(10) })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ing.cas_number || '', font: 'Times New Roman', size: PT(10) })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: ing.concentration || '', font: 'Times New Roman', size: PT(10) })] })],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: '*', font: 'Times New Roman', size: PT(10) })] })],
          }),
        ],
      })
    )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      insideH: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
      insideV: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    },
  })
}

/**
 * 生成 SDS Word 文档 Buffer
 */
async function generateSdsDocx(data) {
  const d = data || {}
  const today = new Date()
  const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`
  const issueDate = d.issue_date || todayStr
  const revisionDate = d.revision_date || todayStr
  const revisionNumber = d.revision_number || '1.0'

  // 主表格 rows（所有 Section 的所有行）
  const tableRows = [
    // Section 1
    createSectionHeader(1, 'Identification'),
    createFieldRow('Product Name', d.product_name),
    createFieldRow('Product Code', d.product_code),
    createFieldRow('Recommended Use', d.recommended_use),
    createFieldRow('Restrictions on Use', d.restrictions_on_use),
    createFieldRow('Supplier/Company Name', d.company_name),
    createFieldRow('Address', d.company_address),
    createFieldRow('Telephone', d.company_phone),
    createFieldRow('Emergency Phone', d.emergency_phone || 'CHEMTREC: +1 (800) 424-9300'),

    // Section 2
    createSectionHeader(2, "Hazard(s) Identification"),
    createFieldRow('GHS Classification', d.ghs_classification),
    createFieldRow('Signal Word', d.signal_word),
    createFieldRow('Hazard Statements', d.hazard_statements),
    createFieldRow('Precautionary Statements', d.precautionary_statements),
    createFieldRow('Other Hazards Not Classified', d.hazards_not_classified),

    // Section 3 (成分表嵌入)
    createSectionHeader(3, 'Composition/Information on Ingredients'),
    new TableRow({
      children: [
        new TableCell({
          children: [createIngredientsTable(d.ingredients)],
          columnSpan: 2,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ],
    }),

    // Section 4
    createSectionHeader(4, 'First-Aid Measures'),
    createFieldRow('Inhalation', d.first_aid_inhalation),
    createFieldRow('Skin Contact', d.first_aid_skin),
    createFieldRow('Eye Contact', d.first_aid_eyes),
    createFieldRow('Ingestion', d.first_aid_ingestion),
    createFieldRow('Notes to Physician', d.first_aid_notes),

    // Section 5
    createSectionHeader(5, 'Fire-Fighting Measures'),
    createFieldRow('Suitable Extinguishing Media', d.extinguishing_media),
    createFieldRow('Unsuitable Extinguishing Media', d.extinguishing_media_not_suitable),
    createFieldRow('Specific Hazards', d.fire_hazards),
    createFieldRow('Special Protective Equipment for Fire-Fighters', d.fire_fighting_instructions),

    // Section 6
    createSectionHeader(6, 'Accidental Release Measures'),
    createFieldRow('Personal Precautions', d.personal_precautions),
    createFieldRow('Environmental Precautions', d.environmental_precautions),
    createFieldRow('Methods and Material for Containment and Clean-Up', d.containment_cleanup),

    // Section 7
    createSectionHeader(7, 'Handling and Storage'),
    createFieldRow('Precautions for Safe Handling', d.safe_handling),
    createFieldRow('Conditions for Safe Storage', d.storage_conditions),
    createFieldRow('Incompatible Materials', d.incompatible_materials),

    // Section 8
    createSectionHeader(8, 'Exposure Controls/Personal Protection'),
    createFieldRow('Occupational Exposure Limits', d.exposure_limits),
    createFieldRow('Engineering Controls', d.engineering_controls),
    createFieldRow('Respiratory Protection', d.ppe_respiratory),
    createFieldRow('Hand Protection', d.ppe_hand),
    createFieldRow('Eye Protection', d.ppe_eye),
    createFieldRow('Skin and Body Protection', d.ppe_skin),

    // Section 9
    createSectionHeader(9, 'Physical and Chemical Properties'),
    createFieldRow('Physical State / Appearance', d.physical_appearance),
    createFieldRow('Odor', d.odor),
    createFieldRow('Odor Threshold', d.odor_threshold || 'N/A'),
    createFieldRow('pH', d.ph || 'N/A'),
    createFieldRow('Melting/Freezing Point', d.melting_point || 'N/A'),
    createFieldRow('Boiling Point', d.boiling_point || 'N/A'),
    createFieldRow('Flash Point', d.flash_point || 'N/A'),
    createFieldRow('Evaporation Rate', d.evaporation_rate || 'N/A'),
    createFieldRow('Flammability (solid, gas)', d.flammability || 'N/A'),
    createFieldRow('Upper/Lower Flammability Limits', d.flammable_limits || 'N/A'),
    createFieldRow('Vapor Pressure', d.vapor_pressure || 'N/A'),
    createFieldRow('Vapor Density (air=1)', d.vapor_density || 'N/A'),
    createFieldRow('Relative Density', d.relative_density || 'N/A'),
    createFieldRow('Solubility in Water', d.solubility || 'N/A'),
    createFieldRow('Partition Coefficient (n-octanol/water)', d.partition_coefficient || 'N/A'),
    createFieldRow('Auto-Ignition Temperature', d.auto_ignition_temp || 'N/A'),
    createFieldRow('Decomposition Temperature', d.decomposition_temp || 'N/A'),

    // Section 10
    createSectionHeader(10, 'Stability and Reactivity'),
    createFieldRow('Reactivity', d.reactivity),
    createFieldRow('Chemical Stability', d.chemical_stability),
    createFieldRow('Possibility of Hazardous Reactions', d.hazardous_reactions),
    createFieldRow('Conditions to Avoid', d.conditions_to_avoid),
    createFieldRow('Incompatible Materials', d.incompatible_chemicals),
    createFieldRow('Hazardous Decomposition Products', d.hazardous_decomposition),

    // Section 11
    createSectionHeader(11, 'Toxicological Information'),
    createFieldRow('Acute Toxicity', d.acute_toxicity),
    createFieldRow('Skin Corrosion/Irritation', d.skin_irritation),
    createFieldRow('Serious Eye Damage/Eye Irritation', d.eye_irritation),
    createFieldRow('Respiratory or Skin Sensitization', d.sensitization),
    createFieldRow('Germ Cell Mutagenicity', d.mutagenicity),
    createFieldRow('Carcinogenicity', d.carcinogenicity),
    createFieldRow('Reproductive Toxicity', d.reproductive_toxicity),
    createFieldRow('STOT — Single Exposure', d.target_organ_single),
    createFieldRow('STOT — Repeated Exposure', d.target_organ_repeat),
    createFieldRow('Aspiration Hazard', d.aspiration_hazard),

    // Section 12
    createSectionHeader(12, 'Ecological Information'),
    createFieldRow('Ecotoxicity', d.ecotoxicity),
    createFieldRow('Persistence and Degradability', d.persistence_degradability),
    createFieldRow('Bioaccumulation Potential', d.bioaccumulation),
    createFieldRow('Mobility in Soil', d.soil_mobility || 'N/A'),
    createFieldRow('Other Adverse Effects', d.other_adverse_effects || 'None known'),

    // Section 13
    createSectionHeader(13, 'Disposal Considerations'),
    createFieldRow('Waste Disposal Methods', d.waste_disposal),

    // Section 14
    createSectionHeader(14, 'Transport Information'),
    createFieldRow('UN Number', d.un_number || 'Not regulated'),
    createFieldRow('UN Proper Shipping Name', d.proper_shipping_name || 'Not regulated'),
    createFieldRow('Transport Hazard Class', d.transport_hazard_class || 'Not applicable'),
    createFieldRow('Packing Group', d.packing_group || 'Not applicable'),
    createFieldRow('Environmental Hazards', d.environmental_hazards_transport || 'Not classified'),
    createFieldRow('Special Precautions for User', d.transport_special_precautions || 'None'),
    createFieldRow('Transport in Bulk', d.transport_bulk || 'Not applicable'),

    // Section 15
    createSectionHeader(15, 'Regulatory Information'),
    createFieldRow('US Federal Regulations', d.us_federal_regulations),
    createFieldRow('State Regulations', d.state_regulations),
    createFieldRow('International Regulations', d.international_regulations),

    // Section 16
    createSectionHeader(16, 'Other Information'),
    createFieldRow('Issue Date', issueDate),
    createFieldRow('Revision Date', revisionDate),
    createFieldRow('Revision Number', revisionNumber),
    createFieldRow('Prepared By', d.prepared_by || 'EHS Department'),
    createFieldRow('Abbreviations and Acronyms', d.abbreviations),
    createFieldRow('Disclaimer', d.disclaimer),
  ]

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: PT(11) },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${d.company_name || ''} | ${d.product_name || ''} | Safety Data Sheet`,
                    font: 'Times New Roman',
                    size: PT(9),
                    color: '666666',
                  }),
                ],
                border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: `Issue Date: ${issueDate}  |  Revision: ${revisionDate} v${revisionNumber}  |  Page `, font: 'Times New Roman', size: PT(9) }),
                  new TextRun({ children: [PageNumber.CURRENT], font: 'Times New Roman', size: PT(9) }),
                  new TextRun({ text: ' of ', font: 'Times New Roman', size: PT(9) }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Times New Roman', size: PT(9) }),
                ],
                alignment: AlignmentType.RIGHT,
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: '000000' } },
              }),
            ],
          }),
        },
        children: [
          // 文档标题
          new Paragraph({
            children: [
              new TextRun({
                text: 'SAFETY DATA SHEET',
                bold: true,
                font: 'Times New Roman',
                size: PT(22),
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: PT(4) },
          }),
          // 产品名称
          new Paragraph({
            children: [
              new TextRun({
                text: d.product_name || '',
                bold: true,
                font: 'Times New Roman',
                size: PT(14),
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: PT(4) },
            border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000' } },
          }),
          // 主表格
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              insideH: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
              insideV: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
            },
          }),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

module.exports = { generateSdsDocx }
