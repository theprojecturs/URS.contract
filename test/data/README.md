# How to add calculation data set

## Diagram

---

    /_____fio___\__________________/lio\___________
    |       v   m |         v     |     l   v     |
    |___slot #n___|___slot #n+1___|____slot #n+2__|
    |<-slot size->|<-offset>v                     *
                                      last target index

        m : my index (incl.)
        l : last index (incl.), l = m + amount - 1
        v : valid ticket
        fio : first index offset
        lio : last index offset
        n, n+1,... : slot index

        v in (slot #n+1) is ths firstWinIndex
        v in (slot #n+1) is ths lastWinIndex

## Terms (excl. Variables)

---

**index**

- 'ticket number' is referred as index here

**first index offset(fio)**

- offset of my index in the slot

**last index offset(lio)**

- offset of my last index in the slot
- my last index : last ticket number (my index + amount - 1)

**first win index**

- very first selected ticket among my whole tickets

**first win index**

- very last selected ticket among my whole tickets

**valid ticket**

- each slot has only one valid ticket
- if user own this valid ticket, he can mint URS

**last target index**

- last index(ticket number) which is in the slots
- if my index(ticket number) exceeds the last target index, it is useless

## Variables

---

**preMintedURS**

- number of minted URS by team

**newlyMintedURSWithPass**

- number of minted URS by MintPass

**totalTickets**

- number of tickets picked by participants

**raffleNumber**

- raffleNumber injected by team

**slotSizeExpected**

- expected slotSize number which is calculated

**offsetInSlotExpected**

- expected offsetInSlot number which is calculated

**lastTargetIndexExpected**

- expected last index of the last available ticket (incl.)
- ticket which index is out of this index must not be picked

**myIndex**

- index which indicates my first ticket number
- myIndex saved with 'takingTickets' request

**myAmount**

- amount of tickets user took
- amount saved with 'takingTickets' request

**validTicketAmountExpected**

- expected valid ticket amount calculated by raffle number

## Calculation Logic

---

1. remaining URS

```
remainingURS = maxURS - preMintedURS(by team) - mintedURSWithPass
```

2. slot size

   - round down the result

```
slotSize = totalTickets / remainingURS
```

3. offset in slot

```
offsetInSlot = raffleNumber % slotSize
```

4. last target index

```
lastTargetIndex = slotSize * remainingURS - 1
```

5. last ticket index (my ticket)

```
lastIndex = myIndex + amount - 1
```

6. first index offset

```
firstIndexOffset = myIndex % slotSize
```

7. last index offset

```
lastIndexOffset = lastIndex % slotSize
```

8. first win index

   1. if first index offset is less than or equal to offset in slot
   2. if first index offset is greater than offset in slot

```
if (firstIndexOffset <= offsetInSlot) {
  firstWinIndex = myIndex + offsetInSlot - firstIndexOffset
} else {
  firstWinIndex = myIndex + slotSize + offsetInSlot - firstIndexOffset
}
```

9. check whether first win index is out of the last target index

   - if first win index is greater than the last target index, valid ticket amount is 0, and finish the logic

```
if (firstWinIndex > lastTargetIndex) {
  validTicketAmount = 0
}
```

- proceeds following steps only when firstWinIndex is less than or equal to the last target index

```
if (firstWinIndex <= lastTargetIndex)
```

10. last win index

    1. if last index offset is greater than or equal to offset in slot
    2. if last index offset is less than offset in slot

```
if (lastIndexOffset >= offsetInSlot) {
  lastWinIndex = lastIndex + offsetInSlot - lastIndexOffset
} else {
  lastWinIndex = lastIndex + offsetInSlot - lastIndexOffset - slotSize
}
```

11. check last win index range

- make last win index is in the valid slot

```
while (lastWinIndex > lastTargetIndex) {
  lastWinIndex = lastWinIndex - slotSize
}
```

12. calculate valid ticket amount

    1. if first win index is greater than last win index
    2. if first win index is less than or equal to the last win index

```
if (firstWinIndex > lastWinIndex) {
  validTicketAmount = 0
} else {
  validTicketAmount = ((lastWinIndex - firstWinIndex) / slotSize) + 1
}
```
