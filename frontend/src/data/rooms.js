/**
 * Room labels transcribed VERBATIM from each flat on the typical floor plans:
 * Block A p10, Block B p11, Block C p12. Names and dimensions are exactly as printed
 * (including the plan's own inconsistencies — see notes below). Every flat was read
 * individually from the native-resolution raster; flats listed together print identical labels.
 *
 * Printed quirks kept as-is:
 *  - C-13 prints Drawing as 14'1"X11"3" (inch mark where a foot mark is expected; C-09–12 print 14'1"X11'3").
 *  - C-08 prints its bedrooms as 14'2"X11'0" and 13'1"X11'0" (C-01–07 print …X11').
 *  - B-07 prints the kitchen with a lowercase "x" (10'7"x15'8").
 *  - Balconies and wash areas print a width only, not a room size.
 */

const r = (name, dims) => (dims ? { name, dims } : { name })

// ---- Block A (p10) ---------------------------------------------------------------------
const A_1150 = [
  r('LIVING', `14'11"X10'6"`),
  r('DINING', `9'8"X10'10"`),
  r('KITCHEN', `9'3"X7'2"`),
  r('M.BEDROOM', `13'11"X10'10"`),
  r('BEDROOM', `14'X10'6"`),
  r('TOILET', `4'3"X7'7"`),
  r('TOILET', `4'X8'7"`),
  r(`4'6" WIDE BALCONY`),
  r("4' WIDE WASH"),
]
const A_02 = [
  r('LIVING', `14'11"X10'6"`),
  r('DINING', `9'8"X11'7"`),
  r('KITCHEN', `9'3"X7'11"`),
  r('M.BEDROOM', `13'11"X11'7"`),
  r('BEDROOM', `14'X10'6"`),
  r('TOILET', `4'3"X8'4"`),
  r('TOILET', `4'X8'7"`),
  r(`4'6" WIDE BALCONY`),
  r("4' WIDE WASH"),
]
const A_01 = [
  r('LIVING', `9'10"X15'10"`),
  r('DINING', `9'8"X13'2"`),
  r('KITCHEN', `10'7"X8'6"`),
  r('M.BEDROOM', `12'6"X12'2"`),
  r('BEDROOM', `12'6"X11'2"`),
  r('BEDROOM', `10'1"X11'2"`),
  r('DRESS', `4'3"X3'10"`),
  r('TOILET', `4'3"X7'11"`),
  r('TOILET', `4'3"X9'2"`),
  r('TOILET', `8'X4'5"`),
  r("4' WIDE WASH/BALCONY"),
]
const A_0708 = [
  r('LIVING', `17'11"X10'1"`),
  r('DINING', `10'9"X11'3"`),
  r('KITCHEN', `8'2"X7'7"`),
  r('M.BEDROOM', `13'1"X11'3"`),
  r('BEDROOM', `13'11"X10'1"`),
  r('TOILET', `4'X7'7"`),
  r('TOILET', `4'3"X8'5"`),
  r(`4'6" WIDE BALCONY`),
  r("4' WIDE WASH"),
]
const A_09 = [
  r('LIVING', `17'11"X10'1"`),
  r('DINING', `10'9"X11'2"`),
  r('KITCHEN', `8'2"X7'7"`),
  r('M.BEDROOM', `13'1"X11'1"`),
  r('BEDROOM', `13'11"X10'1"`),
  r('TOILET', `4'X7'7"`),
  r('TOILET', `4'3"X8'2"`),
  r(`4'6" WIDE BALCONY`),
  r("4' WIDE WASH"),
]
const A_10 = [
  r('LIVING', `17'11"X10'4"`),
  r('DINING', `10'9"X11'7"`),
  r('KITCHEN', `8'2"X7'11"`),
  r('M.BEDROOM', `13'1"X11'7"`),
  r('BEDROOM', `13'11"X10'5"`),
  r('TOILET', `4'X8'4"`),
  r('TOILET', `4'3"X8'3"`),
  r(`4'6" WIDE BALCONY`),
  r("4' WIDE WASH"),
]
const A_11 = [
  r('LIVING', `10'X16'10"`),
  r('DINING', `17'11"X8'9"`),
  r('KITCHEN', `9'1"X7'7"`),
  r('M.BEDROOM', `14'9"X11'2"`),
  r('BEDROOM', `11'1"X11'6"`),
  r('BEDROOM', `10'8"X11'6"`),
  r('DRESS', `4'4"X3'10"`),
  r('TOILET', `4'1"X7'5"`),
  r('TOILET', `4'1"X7'5"`),
  r('TOILET', `4'X7'4"`),
  r(`4'6" WIDE BALCONY`),
  r("4' WIDE WASH/BALCONY"),
]

// ---- Block B (p11) ---------------------------------------------------------------------
const B_1295 = [
  r('LIVING', `17'2"X10'1"`),
  r('DINING', `9'8"X11'3"`),
  r('KITCHEN', `9'3"X7'3"`),
  r('M.BEDROOM', `13'11"X11'3"`),
  r('BEDROOM', `13'11"X10'1"`),
  r('TOILET', `4'3"X7'7"`),
  r('TOILET', `6'X6'10"`),
  r("5' WIDE BALCONY"),
  r("5' WIDE BALCONY"),
  r(`4'4" WIDE WASH`),
]
const B_06 = [
  r('LIVING', `9'11"X15'10"`),
  r('DINING', `10'1"X17'`),
  r('KITCHEN', `10'3"X8'6"`),
  r('M.BEDROOM', `12'6"X12'2"`),
  r('BEDROOM', `12'3"X11'6"`),
  r('BEDROOM', `10'11"X11'`),
  r('TOILET', `4'3"X8'0"`),
  r('TOILET', `7'11"X4'`),
  r('TOILET', `7'11"X4'`),
  r("5' WIDE BALCONY"),
  r("5' WIDE BALCONY"),
  r("4' WIDE WASH"),
]
const B_07 = [
  r('LIVING', `10'0"X16'10"`),
  r('DINING', `8'5"X15'8"`),
  r('KITCHEN', `10'7"x15'8"`),
  r('M.BEDROOM', `14'9"X11'2"`),
  r('BEDROOM', `11'1"X12'4"`),
  r('BEDROOM', `10'7"X12'4"`),
  r('TOILET', `5'X7'5"`),
  r('TOILET', `4'X7'8"`),
  r('PWR', `4'X4'4"`),
  r("5' WIDE BALCONY"),
  r("5' WIDE WASH"),
]
const B_1265 = (mBedroom) => [
  r('LIVING', `17'11"X10'6"`),
  r('DINING', `10'4"X10'10"`),
  r('KITCHEN', `8'7"X10'10"`),
  r('M.BEDROOM', mBedroom),
  r('BEDROOM', `13'11"X10'6"`),
  r('TOILET', `4'X7'7"`),
  r('TOILET', `4'3"X8'5"`),
  r("5' WIDE BALCONY"),
  r("5' WIDE WASH"),
]

// ---- Block C (p12) ---------------------------------------------------------------------
const C_1810 = (bedroomSuffix) => [
  r('DRAWING', `11'X16'`),
  r('LIVING', `15'3"X8'3"`),
  r('DINING', `10'5"X10'4"`),
  r('KITCHEN', `11'4"X9'5"`),
  r('M.BEDROOM', `12'X14'3"`),
  r('BEDROOM', bedroomSuffix ? `14'2"X11'0"` : `14'2"X11'`),
  r('BEDROOM', bedroomSuffix ? `13'1"X11'0"` : `13'1"X11'`),
  r('TOILET', `4'6"X10'`),
  r('TOILET', `8'X4'`),
  r('TOILET', `8'X4'`),
  r("5' WIDE BALCONY"),
  r(`4'6" WIDE WASH`),
]
const C_1840 = (drawing) => [
  r('DRAWING', drawing),
  r('LIVING/DINING', `20'4"X11'3"`),
  r('KITCHEN', `12'X11'4"`),
  r('M.BEDROOM', `17'3"X11'`),
  r('BEDROOM', `12'5"X11'`),
  r('BEDROOM', `12'X11'`),
  r('TOILET', `4'6"X11'`),
  r('TOILET', `4'6"X11'`),
  r('TOILET', `4'6"X11'`),
  r("5' WIDE BALCONY"),
  r("5' WASH/BALCONY"),
]
const C_14 = [
  r('DRAWING', `14'4"X10'6"`),
  r('DINING', `14'4"X13'9"`),
  r('KITCHEN', `9'X8'7"`),
  r('M.BEDROOM', `14'X11'6"`),
  r('BEDROOM', `10'5"X11'3"`),
  r('BEDROOM', `9'3"X11'3"`),
  r('TOILET', `5'X8'3"`),
  r('TOILET', `4'X11'3"`),
  r('TOILET', `4'X8'`),
  r("5' WIDE BALCONY"),
  r("5' WASH/BALCONY"),
]

/** Rooms per flat number, per block. */
export const roomsByFlat = {
  A: {
    1: A_01,
    2: A_02,
    3: A_1150,
    4: A_1150,
    5: A_1150,
    6: A_1150,
    7: A_0708,
    8: A_0708,
    9: A_09,
    10: A_10,
    11: A_11,
  },
  B: {
    1: B_1295,
    2: B_1295,
    3: B_1295,
    4: B_1295,
    5: B_1295,
    6: B_06,
    7: B_07,
    8: B_1265(`13'1"X10'10"`),
    9: B_1265(`13'1"X10'9"`),
    10: B_1265(`13'1"X10'10"`),
    11: B_1265(`13'1"X10'10"`),
  },
  C: {
    1: C_1810(''),
    2: C_1810(''),
    3: C_1810(''),
    4: C_1810(''),
    5: C_1810(''),
    6: C_1810(''),
    7: C_1810(''),
    8: C_1810('0'),
    9: C_1840(`14'1"X11'3"`),
    10: C_1840(`14'1"X11'3"`),
    11: C_1840(`14'1"X11'3"`),
    12: C_1840(`14'1"X11'3"`),
    13: C_1840(`14'1"X11"3"`),
    14: C_14,
  },
}

export const getRooms = (blockId, flatNo) => roomsByFlat[blockId]?.[flatNo] ?? []

/** Plain-language names for printed abbreviations (display only; printed name is always shown too). */
export const roomDisplayName = (printed) => ({ 'M.BEDROOM': 'Master bedroom', PWR: 'Powder room' })[printed] ?? printed
