/**
 * Brochure inconsistencies — recorded, never resolved. Mirrors docs/DATA_DECISIONS.md.
 */
export const dataExceptions = {
  'block-c-unit-count': {
    id: 'block-c-unit-count',
    title: 'Block C unit count',
    statements: [
      { label: 'Declared Block C units', value: 154, source: { page: 3 } },
      {
        label: 'Flats per typical floor × residential floors (14 × 10)',
        value: 140,
        source: { page: 12, note: 'Area statement lists 14 flats; p3 gives C+S+10 floors' },
      },
    ],
    decision:
      'Keep 154 as the declared count. Generate only the 140 apartments the typical floor plan supports; ' +
      'the 14-unit gap is reported as a known mismatch and not auto-reconciled.',
  },
  'block-c-flat-13-label': {
    id: 'block-c-flat-13-label',
    title: 'Block C flat 13 numbering',
    statements: [
      { label: 'Area statement flat number', value: '13', source: { page: 12 } },
      { label: 'Master plan tile label', value: '12 A', source: { page: 6 } },
      { label: 'Typical floor plan unit tag', value: '13', source: { page: 12 } },
    ],
    decision:
      'Keep both labels on the stack. Apartment IDs use the area-statement number (13), which the floor-plan tag on the same page also prints.',
  },
  'clubhouse-area': {
    id: 'clubhouse-area',
    title: 'Clubhouse area',
    statements: [
      { label: 'Headline clubhouse area (sft)', value: 18600, source: { page: 3, note: 'Also p21' } },
      { label: 'Master plan clubhouse label (sft)', value: 18648, source: { page: 6 } },
    ],
    decision: 'Use 18,600 sft as the project headline; preserve 18,648 sft wherever the master plan is shown.',
  },
}
