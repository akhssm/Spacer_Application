/**
 * Block templates, transcribed from the brochure.
 *   Area statements (flat no., BHK, facing, sft): p10 (A), p11 (B), p12 (C)
 *   Master plan tile labels (label, sft):         p6
 *   Declared unit counts:                         p3
 *   Levels "C+S+10" (cellar + stilt + 10 floors): p3
 */

const stacks = (rows) =>
  rows.map(([flatNo, bhk, facing, areaSft, label, mpSft]) => ({
    flatNo,
    bhk,
    facing,
    areaSft,
    masterPlan: { label, areaSft: mpSft },
  }))

const levels = { value: { cellar: 1, stilt: 1, residentialFloors: 10 }, source: { page: 3 } }

export const blocks = [
  {
    id: 'A',
    name: 'Block A',
    declaredUnits: { value: 110, source: { page: 3 } },
    levels,
    areaStatementSource: { page: 10 },
    floorPlanAssetId: 'floor-plan-block-a',
    stacks: stacks([
      [1, 3, 'East', 1480, '01', 1480],
      [2, 2, 'East', 1185, '02', 1185],
      [3, 2, 'East', 1150, '03', 1150],
      [4, 2, 'East', 1150, '04', 1150],
      [5, 2, 'East', 1150, '05', 1150],
      [6, 2, 'East', 1150, '06', 1150],
      [7, 2, 'West', 1185, '07', 1185],
      [8, 2, 'West', 1185, '08', 1185],
      [9, 2, 'West', 1185, '09', 1185],
      [10, 2, 'West', 1225, '10', 1225],
      [11, 3, 'West', 1515, '11', 1515],
    ]),
  },
  {
    id: 'B',
    name: 'Block B',
    declaredUnits: { value: 110, source: { page: 3 } },
    levels,
    areaStatementSource: { page: 11 },
    floorPlanAssetId: 'floor-plan-block-b',
    stacks: stacks([
      [1, 2, 'East', 1295, '01', 1295],
      [2, 2, 'East', 1295, '02', 1295],
      [3, 2, 'East', 1295, '03', 1295],
      [4, 2, 'East', 1295, '04', 1295],
      [5, 2, 'East', 1295, '05', 1295],
      [6, 3, 'East', 1670, '06', 1670],
      [7, 3, 'West', 1630, '07', 1630],
      [8, 2, 'West', 1265, '08', 1265],
      [9, 2, 'West', 1265, '09', 1265],
      [10, 2, 'West', 1265, '10', 1265],
      [11, 2, 'West', 1265, '11', 1265],
    ]),
  },
  {
    id: 'C',
    name: 'Block C',
    declaredUnits: { value: 154, source: { page: 3 } },
    levels,
    areaStatementSource: { page: 12 },
    floorPlanAssetId: 'floor-plan-block-c',
    exceptions: ['block-c-unit-count'],
    stacks: stacks([
      [1, 3, 'East', 1810, '01', 1810],
      [2, 3, 'East', 1810, '02', 1810],
      [3, 3, 'East', 1810, '03', 1810],
      [4, 3, 'East', 1810, '04', 1810],
      [5, 3, 'East', 1810, '05', 1810],
      [6, 3, 'East', 1810, '06', 1810],
      [7, 3, 'East', 1810, '07', 1810],
      [8, 3, 'East', 1810, '08', 1810],
      [9, 3, 'West', 1840, '09', 1840],
      [10, 3, 'West', 1840, '10', 1840],
      [11, 3, 'West', 1840, '11', 1840],
      [12, 3, 'West', 1840, '12', 1840],
      [13, 3, 'West', 1840, '12 A', 1840],
      [14, 3, 'West', 1590, '14', 1590],
    ]).map((s) => (s.flatNo === 13 ? { ...s, exceptions: ['block-c-flat-13-label'] } : s)),
  },
]
