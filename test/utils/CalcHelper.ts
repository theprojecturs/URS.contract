import calcData from '../data/calculation.json';

export interface TestSet {
  // Raffle
  preMintedURS: number;
  newlyMintedURSWithPass: number;
  totalTickets: number;
  raffleNumber: number;
  slotSizeExpected: number;
  offsetInSlotExpected: number;
  lastTargetIndexExpected: number;

  // Valid Ticket Calculation
  myIndex: number;
  myAmount: number;
  validTicketAmountExpected: number;
}

export const testSets: TestSet[] = calcData;

export const testSetForPrint = ({
  count,
  testSet,
}: {
  count: number;
  testSet: TestSet;
}) => {
  return Object.keys(testSet).reduce(
    (acc, v) => `${acc}, ${v}: ${testSet[v as keyof TestSet]}`,
    `${count}`
  );
};
