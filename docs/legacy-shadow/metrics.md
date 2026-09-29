# Shadow study: metrics

All results are bot tournaments, not human balance measurements. Each complete arm has 20 seeds at each of 4, 5 and 6 players, four games per tournament, 24 hidden-world samples per bot decision. Same seed labels are used across arms; changed deck sizes and decisions cause paths to diverge. See README for the exact circulation rule and limitations.

## control (152 cards)

| Players | Tournaments / hands | Finished | Smallest collection at hand boundary | Minimum undrawn | Empty deck episodes | Mean private draws / player-hand |
| ------- | ------------------- | -------- | ------------------------------------ | --------------- | ------------------- | -------------------------------- |
| 4       | 20 / 320            | 20/20    | 26                                   | 17              | 0                   | 2.44                             |
| 5       | 20 / 400            | 20/20    | 20                                   | 11              | 0                   | 2.13                             |
| 6       | 20 / 480            | 20/20    | 11                                   | 1               | 0                   | 2.01                             |

| Players | Showdowns / hands | Kong winning hands | Mean successive opening overlap / 7 | Maximum same winning core | Mean distinct physical cards held |
| ------- | ----------------- | ------------------ | ----------------------------------- | ------------------------- | --------------------------------- |
| 4       | 147/320           | 19/320 (5.94%)     | 0.658                               | 3                         | 92.25                             |
| 5       | 178/400           | 23/400 (5.75%)     | 0.808                               | 3                         | 96.63                             |
| 6       | 218/480           | 40/480 (8.33%)     | 0.995                               | 3                         | 100.625                           |

A core is the selected winning faces, including the particular Joker color, held by the same player. Repeated category names with different cards are not repeated cores. Winning hands include uncontested wins and any awarded pot; category percentages need not sum to 100% when pots are split.

| Players | Strong-deal probe game 1 → 4 | Original collection retained at game 4 | Weak opening → any pot | Last after game 1 → tournament winner |
| ------- | ---------------------------- | -------------------------------------- | ---------------------- | ------------------------------------- |
| 4       | 0.49% → 1.35%                | 33.50%                                 | 61/367 (16.62%)        | 6/20                                  |
| 5       | 0.61% → 1.40%                | 23.90%                                 | 46/350 (13.14%)        | 3/20                                  |
| 6       | 0.93% → 1.89%                | 18.40%                                 | 78/811 (9.62%)         | 4/20                                  |

“Strong” means containing Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Dragons, Four Winds, Kong or Quint, excluding hands with exactly one Lotus. Each player collection is sampled 100 times at the start of each game. It is a fixed basket across ladder variants, not a rank threshold. It excludes standalone Dragon/Wind trios. “Weak” means at least half the table size (rounded up) has a strictly higher opening category; this excludes many tied weak starts. “Last” and tournament wins include ties. These are descriptive comeback measures, not equal-opportunity probabilities.

| Players | Sticks spent | Riichi declared / won | Sticks awarded | Loans | Player-game eliminations | Treasure payout, chips |
| ------- | ------------ | --------------------- | -------------- | ----- | ------------------------ | ---------------------- |
| 4       | 717          | 46 / 43               | 86             | 12    | 0                        | 1340                   |
| 5       | 895          | 54 / 53               | 106            | 22    | 3                        | 3020                   |
| 6       | 1114         | 89 / 82               | 164            | 69    | 9                        | 3900                   |

### Ladder: all player counts combined

Denominators: 6126 dealt player-hands; 2146 non-folded showdown participants; 1200 table hands. Contains counts overlap and include combinations hidden by a stronger one. End-of-hand includes folded hands. Single-Lotus disqualification is separate from category detection.

| Kind              | Opening contains | End contains | Showdown contains | Showdown best | Winning table hands |
| ----------------- | ---------------- | ------------ | ----------------- | ------------- | ------------------- |
| high-card         | 6126             | 6126         | 2146              | 23            | 0                   |
| eye               | 2552             | 4824         | 1845              | 121           | 0                   |
| chow              | 716              | 2168         | 915               | 121           | 0                   |
| two-eyes          | 327              | 2417         | 1002              | 445           | 11                  |
| pung              | 227              | 1328         | 577               | 70            | 1                   |
| three-winds       | 151              | 443          | 185               | 119           | 6                   |
| chow-eye          | 111              | 1424         | 715               | 581           | 127                 |
| three-dragons     | 49               | 207          | 61                | 29            | 64                  |
| pung-eye          | 26               | 924          | 415               | 399           | 495                 |
| twin-lotus        | 15               | 63           | 11                | 11            | 50                  |
| long-chow         | 6                | 198          | 106               | 106           | 149                 |
| three-dragons-eye | 4                | 93           | 32                | 32            | 76                  |
| four-winds        | 14               | 147          | 56                | 56            | 137                 |
| kong              | 2                | 86           | 33                | 32            | 82                  |
| quint             | 0                | 2            | 1                 | 1             | 2                   |

### Cards in the opening hand

These are associations with receiving any pot, not causal card values. Several card types can coexist in the same hand; pursuit, position, opponents, exposure, and folds confound these rates. Physical copies are grouped by face.

| Face               | Opening holders | Any-pot winners | Rate   |
| ------------------ | --------------- | --------------- | ------ |
| bamboo-1           | 1022            | 177             | 17.32% |
| bamboo-2           | 1024            | 192             | 18.75% |
| bamboo-3           | 1049            | 217             | 20.69% |
| bamboo-4           | 1070            | 207             | 19.35% |
| bamboo-5           | 1083            | 212             | 19.58% |
| bamboo-6           | 1049            | 184             | 17.54% |
| bamboo-7           | 1017            | 213             | 20.94% |
| bamboo-8           | 1031            | 199             | 19.30% |
| bamboo-9           | 1037            | 187             | 18.03% |
| blank              | 1299            | 260             | 20.02% |
| characters-1       | 1035            | 190             | 18.36% |
| characters-2       | 1048            | 174             | 16.60% |
| characters-3       | 1035            | 164             | 15.85% |
| characters-4       | 1046            | 197             | 18.83% |
| characters-5       | 1016            | 182             | 17.91% |
| characters-6       | 1017            | 201             | 19.76% |
| characters-7       | 1051            | 193             | 18.36% |
| characters-8       | 1033            | 188             | 18.20% |
| characters-9       | 1002            | 166             | 16.57% |
| dots-1             | 1051            | 167             | 15.89% |
| dots-2             | 1034            | 192             | 18.57% |
| dots-3             | 1019            | 194             | 19.04% |
| dots-4             | 1051            | 181             | 17.22% |
| dots-5             | 1028            | 165             | 16.05% |
| dots-6             | 1036            | 199             | 19.21% |
| dots-7             | 1029            | 208             | 20.21% |
| dots-8             | 1047            | 188             | 17.96% |
| dots-9             | 1028            | 188             | 18.29% |
| dragon-green       | 1057            | 226             | 21.38% |
| dragon-red         | 1047            | 234             | 22.35% |
| dragon-white       | 1020            | 213             | 20.88% |
| flower-black-lotus | 272             | 50              | 18.38% |
| flower-white-lotus | 283             | 53              | 18.73% |
| joker-black        | 282             | 83              | 29.43% |
| joker-blue         | 260             | 86              | 33.08% |
| joker-green        | 279             | 79              | 28.32% |
| joker-red          | 280             | 87              | 31.07% |
| treasure-1         | 285             | 57              | 20.00% |
| treasure-2         | 301             | 66              | 21.93% |
| treasure-3         | 285             | 47              | 16.49% |
| treasure-4         | 292             | 63              | 21.58% |
| treasure-5         | 305             | 51              | 16.72% |
| wind-east          | 1054            | 208             | 19.73% |
| wind-north         | 1071            | 251             | 23.44% |
| wind-south         | 1052            | 223             | 21.20% |
| wind-west          | 1049            | 211             | 20.11% |

## shadow-above (192 cards)

| Players | Tournaments / hands | Finished | Smallest collection at hand boundary | Minimum undrawn | Empty deck episodes | Mean private draws / player-hand |
| ------- | ------------------- | -------- | ------------------------------------ | --------------- | ------------------- | -------------------------------- |
| 4       | 20 / 320            | 20/20    | 38                                   | 28              | 0                   | 2.60                             |
| 5       | 20 / 400            | 20/20    | 27                                   | 18              | 0                   | 2.33                             |
| 6       | 20 / 480            | 20/20    | 20                                   | 10              | 0                   | 2.08                             |

| Players | Showdowns / hands | Kong winning hands | Mean successive opening overlap / 7 | Maximum same winning core | Mean distinct physical cards held |
| ------- | ----------------- | ------------------ | ----------------------------------- | ------------------------- | --------------------------------- |
| 4       | 182/320           | 11/320 (3.44%)     | 0.517                               | 2                         | 103.112                           |
| 5       | 189/400           | 14/400 (3.50%)     | 0.636                               | 2                         | 106.54                            |
| 6       | 191/480           | 35/480 (7.29%)     | 0.78                                | 3                         | 111.558                           |

A core is the selected winning faces, including the particular Joker color, held by the same player. Repeated category names with different cards are not repeated cores. Winning hands include uncontested wins and any awarded pot; category percentages need not sum to 100% when pots are split.

| Players | Strong-deal probe game 1 → 4 | Original collection retained at game 4 | Weak opening → any pot | Last after game 1 → tournament winner |
| ------- | ---------------------------- | -------------------------------------- | ---------------------- | ------------------------------------- |
| 4       | 0.57% → 0.53%                | 39.70%                                 | 47/286 (16.43%)        | 5/20                                  |
| 5       | 0.37% → 0.86%                | 29.30%                                 | 24/238 (10.08%)        | 2/20                                  |
| 6       | 0.38% → 1.10%                | 20.10%                                 | 57/640 (8.91%)         | 0/20                                  |

“Strong” means containing Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Dragons, Four Winds, Kong or Quint, excluding hands with exactly one Lotus. Each player collection is sampled 100 times at the start of each game. It is a fixed basket across ladder variants, not a rank threshold. It excludes standalone Dragon/Wind trios. “Weak” means at least half the table size (rounded up) has a strictly higher opening category; this excludes many tied weak starts. “Last” and tournament wins include ties. These are descriptive comeback measures, not equal-opportunity probabilities.

| Players | Sticks spent | Riichi declared / won | Sticks awarded | Loans | Player-game eliminations | Treasure payout, chips |
| ------- | ------------ | --------------------- | -------------- | ----- | ------------------------ | ---------------------- |
| 4       | 685          | 29 / 29               | 58             | 1     | 0                        | 1440                   |
| 5       | 891          | 51 / 50               | 100            | 7     | 0                        | 2980                   |
| 6       | 1091         | 74 / 70               | 140            | 29    | 2                        | 2700                   |

### Ladder: all player counts combined

Denominators: 6155 dealt player-hands; 2486 non-folded showdown participants; 1200 table hands. Contains counts overlap and include combinations hidden by a stronger one. End-of-hand includes folded hands. Single-Lotus disqualification is separate from category detection.

| Kind              | Opening contains | End contains | Showdown contains | Showdown best | Winning table hands |
| ----------------- | ---------------- | ------------ | ----------------- | ------------- | ------------------- |
| high-card         | 6155             | 6155         | 2486              | 105           | 0                   |
| eye               | 2143             | 4583         | 2106              | 360           | 1                   |
| chow              | 459              | 1706         | 899               | 206           | 0                   |
| two-eyes          | 229              | 2052         | 1048              | 663           | 34                  |
| pung              | 153              | 962          | 437               | 111           | 16                  |
| three-winds       | 50               | 203          | 95                | 84            | 16                  |
| chow-eye          | 58               | 1028         | 634               | 553           | 224                 |
| three-dragons     | 87               | 366          | 91                | 41            | 150                 |
| pung-eye          | 18               | 578          | 256               | 252           | 396                 |
| twin-lotus        | 7                | 40           | 1                 | 1             | 36                  |
| long-chow         | 4                | 108          | 41                | 41            | 96                  |
| three-dragons-eye | 10               | 128          | 46                | 46            | 114                 |
| four-winds        | 3                | 34           | 6                 | 6             | 34                  |
| four-dragons      | 1                | 23           | 4                 | 4             | 23                  |
| kong              | 4                | 61           | 13                | 13            | 60                  |
| quint             | 0                | 0            | 0                 | 0             | 0                   |

### Cards in the opening hand

These are associations with receiving any pot, not causal card values. Several card types can coexist in the same hand; pursuit, position, opponents, exposure, and folds confound these rates. Physical copies are grouped by face.

| Face               | Opening holders | Any-pot winners | Rate   |
| ------------------ | --------------- | --------------- | ------ |
| bamboo-1           | 801             | 135             | 16.85% |
| bamboo-2           | 826             | 151             | 18.28% |
| bamboo-3           | 874             | 159             | 18.19% |
| bamboo-4           | 812             | 136             | 16.75% |
| bamboo-5           | 825             | 171             | 20.73% |
| bamboo-6           | 856             | 148             | 17.29% |
| bamboo-7           | 865             | 170             | 19.65% |
| bamboo-8           | 847             | 163             | 19.24% |
| bamboo-9           | 864             | 156             | 18.06% |
| blank              | 1018            | 193             | 18.96% |
| characters-1       | 817             | 139             | 17.01% |
| characters-2       | 842             | 144             | 17.10% |
| characters-3       | 817             | 162             | 19.83% |
| characters-4       | 840             | 172             | 20.48% |
| characters-5       | 856             | 151             | 17.64% |
| characters-6       | 835             | 178             | 21.32% |
| characters-7       | 868             | 154             | 17.74% |
| characters-8       | 845             | 176             | 20.83% |
| characters-9       | 866             | 162             | 18.71% |
| dots-1             | 832             | 166             | 19.95% |
| dots-2             | 840             | 152             | 18.10% |
| dots-3             | 833             | 160             | 19.21% |
| dots-4             | 836             | 151             | 18.06% |
| dots-5             | 861             | 147             | 17.07% |
| dots-6             | 805             | 149             | 18.51% |
| dots-7             | 869             | 178             | 20.48% |
| dots-8             | 812             | 159             | 19.58% |
| dots-9             | 817             | 153             | 18.73% |
| dragon-black       | 866             | 215             | 24.83% |
| dragon-green       | 858             | 208             | 24.24% |
| dragon-red         | 844             | 191             | 22.63% |
| dragon-white       | 853             | 212             | 24.85% |
| flower-black-lotus | 232             | 37              | 15.95% |
| flower-white-lotus | 208             | 40              | 19.23% |
| joker-black        | 208             | 89              | 42.79% |
| joker-blue         | 241             | 72              | 29.88% |
| joker-green        | 217             | 68              | 31.34% |
| joker-red          | 255             | 91              | 35.69% |
| shadow-1           | 823             | 147             | 17.86% |
| shadow-2           | 836             | 145             | 17.34% |
| shadow-3           | 849             | 145             | 17.08% |
| shadow-4           | 851             | 155             | 18.21% |
| shadow-5           | 810             | 151             | 18.64% |
| shadow-6           | 846             | 156             | 18.44% |
| shadow-7           | 850             | 151             | 17.76% |
| shadow-8           | 851             | 161             | 18.92% |
| shadow-9           | 799             | 143             | 17.90% |
| treasure-1         | 239             | 53              | 22.18% |
| treasure-2         | 238             | 42              | 17.65% |
| treasure-3         | 221             | 32              | 14.48% |
| treasure-4         | 222             | 40              | 18.02% |
| treasure-5         | 256             | 45              | 17.58% |
| wind-east          | 858             | 148             | 17.25% |
| wind-north         | 834             | 139             | 16.67% |
| wind-south         | 840             | 141             | 16.79% |
| wind-west          | 866             | 146             | 16.86% |

## shadow-ladder-policy (192 cards)

| Players | Tournaments / hands | Finished | Smallest collection at hand boundary | Minimum undrawn | Empty deck episodes | Mean private draws / player-hand |
| ------- | ------------------- | -------- | ------------------------------------ | --------------- | ------------------- | -------------------------------- |
| 4       | 20 / 320            | 20/20    | 38                                   | 28              | 0                   | 2.70                             |
| 5       | 20 / 400            | 20/20    | 24                                   | 13              | 0                   | 2.38                             |
| 6       | 20 / 480            | 20/20    | 17                                   | 8               | 0                   | 2.26                             |

| Players | Showdowns / hands | Kong winning hands | Mean successive opening overlap / 7 | Maximum same winning core | Mean distinct physical cards held |
| ------- | ----------------- | ------------------ | ----------------------------------- | ------------------------- | --------------------------------- |
| 4       | 194/320           | 8/320 (2.50%)      | 0.502                               | 1                         | 103.438                           |
| 5       | 200/400           | 19/400 (4.75%)     | 0.646                               | 3                         | 107.07                            |
| 6       | 240/480           | 33/480 (6.88%)     | 0.771                               | 2                         | 114.208                           |

A core is the selected winning faces, including the particular Joker color, held by the same player. Repeated category names with different cards are not repeated cores. Winning hands include uncontested wins and any awarded pot; category percentages need not sum to 100% when pots are split.

| Players | Strong-deal probe game 1 → 4 | Original collection retained at game 4 | Weak opening → any pot | Last after game 1 → tournament winner |
| ------- | ---------------------------- | -------------------------------------- | ---------------------- | ------------------------------------- |
| 4       | 0.57% → 0.57%                | 40.50%                                 | 43/285 (15.09%)        | 4/20                                  |
| 5       | 0.37% → 0.78%                | 27.60%                                 | 22/218 (10.09%)        | 6/20                                  |
| 6       | 0.38% → 1.00%                | 18.70%                                 | 52/629 (8.27%)         | 1/20                                  |

“Strong” means containing Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Dragons, Four Winds, Kong or Quint, excluding hands with exactly one Lotus. Each player collection is sampled 100 times at the start of each game. It is a fixed basket across ladder variants, not a rank threshold. It excludes standalone Dragon/Wind trios. “Weak” means at least half the table size (rounded up) has a strictly higher opening category; this excludes many tied weak starts. “Last” and tournament wins include ties. These are descriptive comeback measures, not equal-opportunity probabilities.

| Players | Sticks spent | Riichi declared / won | Sticks awarded | Loans | Player-game eliminations | Treasure payout, chips |
| ------- | ------------ | --------------------- | -------------- | ----- | ------------------------ | ---------------------- |
| 4       | 679          | 32 / 30               | 60             | 2     | 0                        | 1900                   |
| 5       | 913          | 66 / 63               | 126            | 13    | 2                        | 2560                   |
| 6       | 1060         | 71 / 60               | 120            | 40    | 0                        | 4540                   |

### Ladder: all player counts combined

Denominators: 6156 dealt player-hands; 2770 non-folded showdown participants; 1200 table hands. Contains counts overlap and include combinations hidden by a stronger one. End-of-hand includes folded hands. Single-Lotus disqualification is separate from category detection.

| Kind              | Opening contains | End contains | Showdown contains | Showdown best | Winning table hands |
| ----------------- | ---------------- | ------------ | ----------------- | ------------- | ------------------- |
| high-card         | 6156             | 6156         | 2770              | 95            | 0                   |
| eye               | 2060             | 4636         | 2352              | 374           | 0                   |
| chow              | 458              | 1734         | 987               | 212           | 3                   |
| two-eyes          | 203              | 2106         | 1158              | 748           | 34                  |
| pung              | 146              | 1017         | 497               | 121           | 17                  |
| three-dragons     | 98               | 379          | 145               | 53            | 82                  |
| three-winds       | 76               | 231          | 128               | 108           | 26                  |
| chow-eye          | 47               | 1044         | 705               | 621           | 250                 |
| pung-eye          | 16               | 614          | 270               | 261           | 397                 |
| twin-lotus        | 4                | 36           | 2                 | 2             | 32                  |
| three-dragons-eye | 16               | 164          | 72                | 70            | 130                 |
| long-chow         | 4                | 97           | 51                | 51            | 85                  |
| four-dragons      | 8                | 42           | 18                | 18            | 36                  |
| four-winds        | 3                | 49           | 16                | 16            | 48                  |
| kong              | 1                | 63           | 20                | 20            | 60                  |
| quint             | 0                | 0            | 0                 | 0             | 0                   |

### Cards in the opening hand

These are associations with receiving any pot, not causal card values. Several card types can coexist in the same hand; pursuit, position, opponents, exposure, and folds confound these rates. Physical copies are grouped by face.

| Face               | Opening holders | Any-pot winners | Rate   |
| ------------------ | --------------- | --------------- | ------ |
| bamboo-1           | 826             | 142             | 17.19% |
| bamboo-2           | 817             | 158             | 19.34% |
| bamboo-3           | 827             | 148             | 17.90% |
| bamboo-4           | 872             | 158             | 18.12% |
| bamboo-5           | 868             | 170             | 19.59% |
| bamboo-6           | 880             | 168             | 19.09% |
| bamboo-7           | 881             | 172             | 19.52% |
| bamboo-8           | 860             | 169             | 19.65% |
| bamboo-9           | 857             | 169             | 19.72% |
| blank              | 1049            | 215             | 20.50% |
| characters-1       | 835             | 151             | 18.08% |
| characters-2       | 850             | 144             | 16.94% |
| characters-3       | 853             | 147             | 17.23% |
| characters-4       | 845             | 155             | 18.34% |
| characters-5       | 788             | 152             | 19.29% |
| characters-6       | 842             | 163             | 19.36% |
| characters-7       | 859             | 172             | 20.02% |
| characters-8       | 808             | 147             | 18.19% |
| characters-9       | 814             | 135             | 16.58% |
| dots-1             | 821             | 136             | 16.57% |
| dots-2             | 824             | 143             | 17.35% |
| dots-3             | 846             | 141             | 16.67% |
| dots-4             | 845             | 152             | 17.99% |
| dots-5             | 825             | 151             | 18.30% |
| dots-6             | 855             | 158             | 18.48% |
| dots-7             | 885             | 158             | 17.85% |
| dots-8             | 862             | 174             | 20.19% |
| dots-9             | 849             | 170             | 20.02% |
| dragon-black       | 831             | 199             | 23.95% |
| dragon-green       | 840             | 216             | 25.71% |
| dragon-red         | 853             | 226             | 26.49% |
| dragon-white       | 878             | 206             | 23.46% |
| flower-black-lotus | 211             | 38              | 18.01% |
| flower-white-lotus | 219             | 47              | 21.46% |
| joker-black        | 227             | 78              | 34.36% |
| joker-blue         | 217             | 63              | 29.03% |
| joker-green        | 229             | 71              | 31.00% |
| joker-red          | 226             | 70              | 30.97% |
| shadow-1           | 863             | 137             | 15.87% |
| shadow-2           | 823             | 157             | 19.08% |
| shadow-3           | 858             | 162             | 18.88% |
| shadow-4           | 820             | 133             | 16.22% |
| shadow-5           | 822             | 165             | 20.07% |
| shadow-6           | 834             | 156             | 18.71% |
| shadow-7           | 894             | 160             | 17.90% |
| shadow-8           | 815             | 131             | 16.07% |
| shadow-9           | 828             | 135             | 16.30% |
| treasure-1         | 239             | 39              | 16.32% |
| treasure-2         | 233             | 36              | 15.45% |
| treasure-3         | 244             | 45              | 18.44% |
| treasure-4         | 229             | 38              | 16.59% |
| treasure-5         | 226             | 40              | 17.70% |
| wind-east          | 856             | 158             | 18.46% |
| wind-north         | 835             | 152             | 18.20% |
| wind-south         | 840             | 171             | 20.36% |
| wind-west          | 848             | 172             | 20.28% |

## shadow-ladder (192 cards)

| Players | Tournaments / hands | Finished | Smallest collection at hand boundary | Minimum undrawn | Empty deck episodes | Mean private draws / player-hand |
| ------- | ------------------- | -------- | ------------------------------------ | --------------- | ------------------- | -------------------------------- |
| 4       | 20 / 320            | 20/20    | 39                                   | 28              | 0                   | 2.41                             |
| 5       | 20 / 400            | 20/20    | 29                                   | 18              | 0                   | 1.95                             |
| 6       | 20 / 480            | 20/20    | 20                                   | 11              | 0                   | 1.81                             |

| Players | Showdowns / hands | Kong winning hands | Mean successive opening overlap / 7 | Maximum same winning core | Mean distinct physical cards held |
| ------- | ----------------- | ------------------ | ----------------------------------- | ------------------------- | --------------------------------- |
| 4       | 129/320           | 7/320 (2.19%)      | 0.526                               | 3                         | 100.9                             |
| 5       | 110/400           | 9/400 (2.25%)      | 0.668                               | 2                         | 103.43                            |
| 6       | 165/480           | 27/480 (5.62%)     | 0.809                               | 2                         | 107.95                            |

A core is the selected winning faces, including the particular Joker color, held by the same player. Repeated category names with different cards are not repeated cores. Winning hands include uncontested wins and any awarded pot; category percentages need not sum to 100% when pots are split.

| Players | Strong-deal probe game 1 → 4 | Original collection retained at game 4 | Weak opening → any pot | Last after game 1 → tournament winner |
| ------- | ---------------------------- | -------------------------------------- | ---------------------- | ------------------------------------- |
| 4       | 0.57% → 0.59%                | 40.50%                                 | 37/260 (14.23%)        | 4/20                                  |
| 5       | 0.37% → 0.75%                | 28.80%                                 | 19/240 (7.92%)         | 2/20                                  |
| 6       | 0.38% → 0.77%                | 19.80%                                 | 47/652 (7.21%)         | 8/20                                  |

“Strong” means containing Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Dragons, Four Winds, Kong or Quint, excluding hands with exactly one Lotus. Each player collection is sampled 100 times at the start of each game. It is a fixed basket across ladder variants, not a rank threshold. It excludes standalone Dragon/Wind trios. “Weak” means at least half the table size (rounded up) has a strictly higher opening category; this excludes many tied weak starts. “Last” and tournament wins include ties. These are descriptive comeback measures, not equal-opportunity probabilities.

| Players | Sticks spent | Riichi declared / won | Sticks awarded | Loans | Player-game eliminations | Treasure payout, chips |
| ------- | ------------ | --------------------- | -------------- | ----- | ------------------------ | ---------------------- |
| 4       | 710          | 40 / 39               | 78             | 10    | 1                        | 780                    |
| 5       | 872          | 42 / 42               | 84             | 18    | 1                        | 1540                   |
| 6       | 1062         | 60 / 60               | 120            | 41    | 9                        | 2400                   |

### Ladder: all player counts combined

Denominators: 6136 dealt player-hands; 1453 non-folded showdown participants; 1200 table hands. Contains counts overlap and include combinations hidden by a stronger one. End-of-hand includes folded hands. Single-Lotus disqualification is separate from category detection.

| Kind              | Opening contains | End contains | Showdown contains | Showdown best | Winning table hands |
| ----------------- | ---------------- | ------------ | ----------------- | ------------- | ------------------- |
| high-card         | 6136             | 6136         | 1453              | 62            | 0                   |
| eye               | 2117             | 4432         | 1198              | 211           | 0                   |
| chow              | 471              | 1692         | 478               | 119           | 4                   |
| two-eyes          | 192              | 1754         | 559               | 312           | 39                  |
| pung              | 121              | 820          | 302               | 67            | 20                  |
| three-dragons     | 86               | 308          | 101               | 32            | 7                   |
| three-winds       | 57               | 209          | 78                | 67            | 18                  |
| chow-eye          | 58               | 961          | 328               | 287           | 436                 |
| pung-eye          | 14               | 458          | 188               | 184           | 289                 |
| twin-lotus        | 8                | 43           | 3                 | 3             | 38                  |
| three-dragons-eye | 11               | 173          | 60                | 57            | 134                 |
| long-chow         | 3                | 86           | 25                | 25            | 79                  |
| four-dragons      | 2                | 47           | 9                 | 9             | 46                  |
| four-winds        | 0                | 48           | 8                 | 8             | 47                  |
| kong              | 4                | 43           | 10                | 10            | 43                  |
| quint             | 0                | 0            | 0                 | 0             | 0                   |

### Cards in the opening hand

These are associations with receiving any pot, not causal card values. Several card types can coexist in the same hand; pursuit, position, opponents, exposure, and folds confound these rates. Physical copies are grouped by face.

| Face               | Opening holders | Any-pot winners | Rate   |
| ------------------ | --------------- | --------------- | ------ |
| bamboo-1           | 801             | 156             | 19.48% |
| bamboo-2           | 818             | 159             | 19.44% |
| bamboo-3           | 844             | 153             | 18.13% |
| bamboo-4           | 848             | 143             | 16.86% |
| bamboo-5           | 833             | 175             | 21.01% |
| bamboo-6           | 805             | 144             | 17.89% |
| bamboo-7           | 867             | 182             | 20.99% |
| bamboo-8           | 819             | 148             | 18.07% |
| bamboo-9           | 832             | 162             | 19.47% |
| blank              | 1087            | 200             | 18.40% |
| characters-1       | 805             | 160             | 19.88% |
| characters-2       | 869             | 149             | 17.15% |
| characters-3       | 836             | 164             | 19.62% |
| characters-4       | 820             | 168             | 20.49% |
| characters-5       | 858             | 168             | 19.58% |
| characters-6       | 825             | 149             | 18.06% |
| characters-7       | 837             | 154             | 18.40% |
| characters-8       | 817             | 158             | 19.34% |
| characters-9       | 836             | 152             | 18.18% |
| dots-1             | 850             | 150             | 17.65% |
| dots-2             | 835             | 143             | 17.13% |
| dots-3             | 844             | 162             | 19.19% |
| dots-4             | 845             | 153             | 18.11% |
| dots-5             | 831             | 153             | 18.41% |
| dots-6             | 842             | 162             | 19.24% |
| dots-7             | 898             | 180             | 20.04% |
| dots-8             | 826             | 152             | 18.40% |
| dots-9             | 869             | 159             | 18.30% |
| dragon-black       | 862             | 202             | 23.43% |
| dragon-green       | 814             | 171             | 21.01% |
| dragon-red         | 854             | 193             | 22.60% |
| dragon-white       | 839             | 217             | 25.86% |
| flower-black-lotus | 243             | 45              | 18.52% |
| flower-white-lotus | 200             | 41              | 20.50% |
| joker-black        | 216             | 87              | 40.28% |
| joker-blue         | 215             | 68              | 31.63% |
| joker-green        | 224             | 83              | 37.05% |
| joker-red          | 229             | 81              | 35.37% |
| shadow-1           | 841             | 135             | 16.05% |
| shadow-2           | 837             | 138             | 16.49% |
| shadow-3           | 860             | 163             | 18.95% |
| shadow-4           | 828             | 139             | 16.79% |
| shadow-5           | 837             | 160             | 19.12% |
| shadow-6           | 865             | 171             | 19.77% |
| shadow-7           | 829             | 145             | 17.49% |
| shadow-8           | 853             | 157             | 18.41% |
| shadow-9           | 844             | 143             | 16.94% |
| treasure-1         | 226             | 37              | 16.37% |
| treasure-2         | 231             | 31              | 13.42% |
| treasure-3         | 225             | 36              | 16.00% |
| treasure-4         | 224             | 43              | 19.20% |
| treasure-5         | 228             | 46              | 20.18% |
| wind-east          | 868             | 156             | 17.97% |
| wind-north         | 836             | 146             | 17.46% |
| wind-south         | 854             | 159             | 18.62% |
| wind-west          | 819             | 132             | 16.12% |

## shadow-restricted (192 cards)

| Players | Tournaments / hands | Finished | Smallest collection at hand boundary | Minimum undrawn | Empty deck episodes | Mean private draws / player-hand |
| ------- | ------------------- | -------- | ------------------------------------ | --------------- | ------------------- | -------------------------------- |
| 4       | 20 / 320            | 20/20    | 40                                   | 31              | 0                   | 2.68                             |
| 5       | 20 / 400            | 20/20    | 29                                   | 18              | 0                   | 2.42                             |
| 6       | 20 / 480            | 20/20    | 22                                   | 11              | 0                   | 2.17                             |

| Players | Showdowns / hands | Kong winning hands | Mean successive opening overlap / 7 | Maximum same winning core | Mean distinct physical cards held |
| ------- | ----------------- | ------------------ | ----------------------------------- | ------------------------- | --------------------------------- |
| 4       | 194/320           | 6/320 (1.88%)      | 0.528                               | 2                         | 103.1                             |
| 5       | 204/400           | 14/400 (3.50%)     | 0.65                                | 2                         | 108.13                            |
| 6       | 199/480           | 23/480 (4.79%)     | 0.782                               | 4                         | 112.725                           |

A core is the selected winning faces, including the particular Joker color, held by the same player. Repeated category names with different cards are not repeated cores. Winning hands include uncontested wins and any awarded pot; category percentages need not sum to 100% when pots are split.

| Players | Strong-deal probe game 1 → 4 | Original collection retained at game 4 | Weak opening → any pot | Last after game 1 → tournament winner |
| ------- | ---------------------------- | -------------------------------------- | ---------------------- | ------------------------------------- |
| 4       | 0.50% → 0.57%                | 40.20%                                 | 45/267 (16.85%)        | 5/20                                  |
| 5       | 0.36% → 0.63%                | 28.10%                                 | 23/221 (10.41%)        | 4/20                                  |
| 6       | 0.36% → 0.93%                | 18.00%                                 | 65/627 (10.37%)        | 7/20                                  |

“Strong” means containing Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Dragons, Four Winds, Kong or Quint, excluding hands with exactly one Lotus. Each player collection is sampled 100 times at the start of each game. It is a fixed basket across ladder variants, not a rank threshold. It excludes standalone Dragon/Wind trios. “Weak” means at least half the table size (rounded up) has a strictly higher opening category; this excludes many tied weak starts. “Last” and tournament wins include ties. These are descriptive comeback measures, not equal-opportunity probabilities.

| Players | Sticks spent | Riichi declared / won | Sticks awarded | Loans | Player-game eliminations | Treasure payout, chips |
| ------- | ------------ | --------------------- | -------------- | ----- | ------------------------ | ---------------------- |
| 4       | 684          | 28 / 28               | 56             | 0     | 0                        | 2080                   |
| 5       | 888          | 51 / 51               | 102            | 10    | 0                        | 2460                   |
| 6       | 1104         | 78 / 75               | 150            | 34    | 3                        | 3660                   |

### Ladder: all player counts combined

Denominators: 6156 dealt player-hands; 2693 non-folded showdown participants; 1200 table hands. Contains counts overlap and include combinations hidden by a stronger one. End-of-hand includes folded hands. Single-Lotus disqualification is separate from category detection.

| Kind              | Opening contains | End contains | Showdown contains | Showdown best | Winning table hands |
| ----------------- | ---------------- | ------------ | ----------------- | ------------- | ------------------- |
| high-card         | 6156             | 6156         | 2693              | 117           | 0                   |
| eye               | 2095             | 4650         | 2315              | 422           | 0                   |
| chow              | 444              | 1725         | 930               | 189           | 0                   |
| two-eyes          | 209              | 2058         | 1126              | 740           | 43                  |
| pung              | 125              | 932          | 433               | 110           | 15                  |
| three-winds       | 55               | 238          | 122               | 91            | 16                  |
| chow-eye          | 47               | 1059         | 676               | 611           | 237                 |
| three-dragons     | 77               | 352          | 91                | 33            | 144                 |
| pung-eye          | 12               | 559          | 251               | 246           | 376                 |
| twin-lotus        | 6                | 32           | 1                 | 1             | 30                  |
| long-chow         | 1                | 103          | 44                | 44            | 87                  |
| three-dragons-eye | 9                | 139          | 55                | 54            | 129                 |
| four-dragons      | 1                | 23           | 4                 | 4             | 23                  |
| four-winds        | 7                | 58           | 22                | 22            | 57                  |
| kong              | 2                | 44           | 9                 | 9             | 43                  |
| quint             | 0                | 0            | 0                 | 0             | 0                   |

### Cards in the opening hand

These are associations with receiving any pot, not causal card values. Several card types can coexist in the same hand; pursuit, position, opponents, exposure, and folds confound these rates. Physical copies are grouped by face.

| Face               | Opening holders | Any-pot winners | Rate   |
| ------------------ | --------------- | --------------- | ------ |
| bamboo-1           | 819             | 152             | 18.56% |
| bamboo-2           | 857             | 166             | 19.37% |
| bamboo-3           | 809             | 158             | 19.53% |
| bamboo-4           | 840             | 150             | 17.86% |
| bamboo-5           | 795             | 153             | 19.25% |
| bamboo-6           | 841             | 167             | 19.86% |
| bamboo-7           | 854             | 174             | 20.37% |
| bamboo-8           | 873             | 154             | 17.64% |
| bamboo-9           | 858             | 146             | 17.02% |
| blank              | 1042            | 199             | 19.10% |
| characters-1       | 824             | 136             | 16.50% |
| characters-2       | 867             | 143             | 16.49% |
| characters-3       | 856             | 140             | 16.36% |
| characters-4       | 822             | 150             | 18.25% |
| characters-5       | 847             | 145             | 17.12% |
| characters-6       | 833             | 161             | 19.33% |
| characters-7       | 883             | 174             | 19.71% |
| characters-8       | 866             | 151             | 17.44% |
| characters-9       | 831             | 149             | 17.93% |
| dots-1             | 820             | 152             | 18.54% |
| dots-2             | 825             | 147             | 17.82% |
| dots-3             | 857             | 162             | 18.90% |
| dots-4             | 875             | 174             | 19.89% |
| dots-5             | 839             | 158             | 18.83% |
| dots-6             | 881             | 167             | 18.96% |
| dots-7             | 844             | 178             | 21.09% |
| dots-8             | 849             | 159             | 18.73% |
| dots-9             | 839             | 163             | 19.43% |
| dragon-black       | 857             | 191             | 22.29% |
| dragon-green       | 834             | 218             | 26.14% |
| dragon-red         | 840             | 214             | 25.48% |
| dragon-white       | 827             | 217             | 26.24% |
| flower-black-lotus | 237             | 35              | 14.77% |
| flower-white-lotus | 222             | 40              | 18.02% |
| joker-black        | 217             | 53              | 24.42% |
| joker-blue         | 227             | 79              | 34.80% |
| joker-green        | 218             | 73              | 33.49% |
| joker-red          | 230             | 80              | 34.78% |
| shadow-1           | 869             | 144             | 16.57% |
| shadow-2           | 868             | 147             | 16.94% |
| shadow-3           | 885             | 159             | 17.97% |
| shadow-4           | 846             | 151             | 17.85% |
| shadow-5           | 809             | 145             | 17.92% |
| shadow-6           | 806             | 156             | 19.35% |
| shadow-7           | 832             | 137             | 16.47% |
| shadow-8           | 877             | 153             | 17.45% |
| shadow-9           | 831             | 148             | 17.81% |
| treasure-1         | 213             | 52              | 24.41% |
| treasure-2         | 243             | 36              | 14.81% |
| treasure-3         | 253             | 42              | 16.60% |
| treasure-4         | 223             | 30              | 13.45% |
| treasure-5         | 244             | 43              | 17.62% |
| wind-east          | 811             | 171             | 21.09% |
| wind-north         | 830             | 166             | 20.00% |
| wind-south         | 810             | 158             | 19.51% |
| wind-west          | 842             | 158             | 18.76% |

## shadow (192 cards)

| Players | Tournaments / hands | Finished | Smallest collection at hand boundary | Minimum undrawn | Empty deck episodes | Mean private draws / player-hand |
| ------- | ------------------- | -------- | ------------------------------------ | --------------- | ------------------- | -------------------------------- |
| 4       | 20 / 320            | 20/20    | 38                                   | 28              | 0                   | 2.60                             |
| 5       | 20 / 400            | 20/20    | 27                                   | 18              | 0                   | 2.31                             |
| 6       | 20 / 480            | 20/20    | 20                                   | 10              | 0                   | 2.08                             |

| Players | Showdowns / hands | Kong winning hands | Mean successive opening overlap / 7 | Maximum same winning core | Mean distinct physical cards held |
| ------- | ----------------- | ------------------ | ----------------------------------- | ------------------------- | --------------------------------- |
| 4       | 183/320           | 11/320 (3.44%)     | 0.515                               | 2                         | 103.05                            |
| 5       | 186/400           | 19/400 (4.75%)     | 0.641                               | 2                         | 106.75                            |
| 6       | 188/480           | 34/480 (7.08%)     | 0.781                               | 3                         | 111.942                           |

A core is the selected winning faces, including the particular Joker color, held by the same player. Repeated category names with different cards are not repeated cores. Winning hands include uncontested wins and any awarded pot; category percentages need not sum to 100% when pots are split.

| Players | Strong-deal probe game 1 → 4 | Original collection retained at game 4 | Weak opening → any pot | Last after game 1 → tournament winner |
| ------- | ---------------------------- | -------------------------------------- | ---------------------- | ------------------------------------- |
| 4       | 0.57% → 0.53%                | 39.70%                                 | 48/286 (16.78%)        | 5/20                                  |
| 5       | 0.37% → 0.90%                | 29.10%                                 | 25/250 (10.00%)        | 2/20                                  |
| 6       | 0.38% → 1.03%                | 19.70%                                 | 57/623 (9.15%)         | 1/20                                  |

“Strong” means containing Pung and Eyes, Twin Lotus, Long Chow, Three Dragons and Eyes, Four Dragons, Four Winds, Kong or Quint, excluding hands with exactly one Lotus. Each player collection is sampled 100 times at the start of each game. It is a fixed basket across ladder variants, not a rank threshold. It excludes standalone Dragon/Wind trios. “Weak” means at least half the table size (rounded up) has a strictly higher opening category; this excludes many tied weak starts. “Last” and tournament wins include ties. These are descriptive comeback measures, not equal-opportunity probabilities.

| Players | Sticks spent | Riichi declared / won | Sticks awarded | Loans | Player-game eliminations | Treasure payout, chips |
| ------- | ------------ | --------------------- | -------------- | ----- | ------------------------ | ---------------------- |
| 4       | 685          | 29 / 29               | 58             | 1     | 0                        | 1440                   |
| 5       | 890          | 52 / 50               | 100            | 8     | 0                        | 2920                   |
| 6       | 1089         | 73 / 69               | 138            | 26    | 3                        | 2460                   |

### Ladder: all player counts combined

Denominators: 6154 dealt player-hands; 2454 non-folded showdown participants; 1200 table hands. Contains counts overlap and include combinations hidden by a stronger one. End-of-hand includes folded hands. Single-Lotus disqualification is separate from category detection.

| Kind              | Opening contains | End contains | Showdown contains | Showdown best | Winning table hands |
| ----------------- | ---------------- | ------------ | ----------------- | ------------- | ------------------- |
| high-card         | 6154             | 6154         | 2454              | 104           | 0                   |
| eye               | 2125             | 4583         | 2088              | 362           | 1                   |
| chow              | 472              | 1713         | 874               | 192           | 0                   |
| two-eyes          | 229              | 2040         | 1048              | 647           | 31                  |
| pung              | 142              | 973          | 446               | 105           | 16                  |
| three-winds       | 50               | 214          | 105               | 89            | 18                  |
| chow-eye          | 55               | 1033         | 624               | 543           | 215                 |
| three-dragons     | 91               | 371          | 85                | 36            | 149                 |
| pung-eye          | 15               | 581          | 269               | 264           | 398                 |
| twin-lotus        | 9                | 44           | 1                 | 1             | 41                  |
| long-chow         | 4                | 104          | 39                | 39            | 93                  |
| three-dragons-eye | 9                | 129          | 45                | 44            | 113                 |
| four-dragons      | 1                | 26           | 5                 | 5             | 26                  |
| four-winds        | 3                | 35           | 8                 | 8             | 35                  |
| kong              | 4                | 65           | 15                | 15            | 64                  |
| quint             | 0                | 0            | 0                 | 0             | 0                   |

### Cards in the opening hand

These are associations with receiving any pot, not causal card values. Several card types can coexist in the same hand; pursuit, position, opponents, exposure, and folds confound these rates. Physical copies are grouped by face.

| Face               | Opening holders | Any-pot winners | Rate   |
| ------------------ | --------------- | --------------- | ------ |
| bamboo-1           | 792             | 143             | 18.06% |
| bamboo-2           | 830             | 146             | 17.59% |
| bamboo-3           | 868             | 162             | 18.66% |
| bamboo-4           | 810             | 139             | 17.16% |
| bamboo-5           | 820             | 172             | 20.98% |
| bamboo-6           | 863             | 147             | 17.03% |
| bamboo-7           | 857             | 174             | 20.30% |
| bamboo-8           | 852             | 162             | 19.01% |
| bamboo-9           | 871             | 159             | 18.25% |
| blank              | 1013            | 194             | 19.15% |
| characters-1       | 807             | 131             | 16.23% |
| characters-2       | 847             | 145             | 17.12% |
| characters-3       | 812             | 161             | 19.83% |
| characters-4       | 831             | 164             | 19.74% |
| characters-5       | 840             | 148             | 17.62% |
| characters-6       | 836             | 171             | 20.45% |
| characters-7       | 859             | 149             | 17.35% |
| characters-8       | 855             | 179             | 20.94% |
| characters-9       | 870             | 161             | 18.51% |
| dots-1             | 843             | 163             | 19.34% |
| dots-2             | 848             | 161             | 18.99% |
| dots-3             | 833             | 152             | 18.25% |
| dots-4             | 832             | 150             | 18.03% |
| dots-5             | 850             | 150             | 17.65% |
| dots-6             | 813             | 152             | 18.70% |
| dots-7             | 876             | 171             | 19.52% |
| dots-8             | 822             | 153             | 18.61% |
| dots-9             | 796             | 147             | 18.47% |
| dragon-black       | 876             | 212             | 24.20% |
| dragon-green       | 848             | 204             | 24.06% |
| dragon-red         | 839             | 191             | 22.77% |
| dragon-white       | 872             | 220             | 25.23% |
| flower-black-lotus | 233             | 36              | 15.45% |
| flower-white-lotus | 206             | 43              | 20.87% |
| joker-black        | 211             | 93              | 44.08% |
| joker-blue         | 235             | 71              | 30.21% |
| joker-green        | 222             | 70              | 31.53% |
| joker-red          | 261             | 98              | 37.55% |
| shadow-1           | 822             | 142             | 17.27% |
| shadow-2           | 838             | 139             | 16.59% |
| shadow-3           | 845             | 148             | 17.51% |
| shadow-4           | 830             | 154             | 18.55% |
| shadow-5           | 832             | 161             | 19.35% |
| shadow-6           | 838             | 162             | 19.33% |
| shadow-7           | 852             | 152             | 17.84% |
| shadow-8           | 857             | 163             | 19.02% |
| shadow-9           | 797             | 147             | 18.44% |
| treasure-1         | 232             | 50              | 21.55% |
| treasure-2         | 230             | 41              | 17.83% |
| treasure-3         | 234             | 36              | 15.38% |
| treasure-4         | 224             | 41              | 18.30% |
| treasure-5         | 247             | 42              | 17.00% |
| wind-east          | 861             | 154             | 17.89% |
| wind-north         | 853             | 137             | 16.06% |
| wind-south         | 864             | 153             | 17.71% |
| wind-west          | 864             | 145             | 16.78% |

## Uncertainty for the main 192 vs 152 comparison

95% percentile bootstrap intervals, 4,000 resamples of whole tournaments (paired seeds for Kong comparison). Not individual hands: hands within a tournament are dependent. The growth intervals measure the defined bot probe, not how much fun humans will have.

| Players | Change in Kong win rate, percentage points | 95% interval     | Strong-probe game 4 minus game 1, points | 95% interval    |
| ------- | ------------------------------------------ | ---------------- | ---------------------------------------- | --------------- |
| 4       | -2.50                                      | [-4.688, -0.312] | -0.05                                    | [-0.263, 0.138] |
| 5       | -1.00                                      | [-4.75, 2.5]     | 0.53                                     | [0.24, 0.82]    |
| 6       | -1.25                                      | [-3.75, 1.458]   | 0.65                                     | [0.375, 0.975]  |
