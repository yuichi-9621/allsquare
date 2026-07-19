// Every user-visible string in the web app, keyed by short camelCase names.
// Interpolation slots use {name} / {n} syntax, replaced by lib/i18n.ts's t().
// This is the source of truth for MessageKey; locales/ja.ts must carry every
// key here (enforced by the Record<MessageKey, string> type there).
export const en = {
  // App shell
  appTagline: "split · settle · all square",

  // Landing
  heroLine1: "Split anything.",
  heroLine2: "End up all square.",
  heroSubtitle:
    "The no-sign-up bill splitter for trips, dinners, and everything your group shares. Any currency, one shared link.",
  startGroup: "Start a group",
  heroFeatures: "No accounts · no cookies · any currency · works offline",
  madeForMoments: "Made for moments like",
  useCaseTripAbroad: "Trip abroad",
  useCaseTripAbroadDesc: "Yen in Tokyo, euros in Paris. Everyone still settles in one currency.",
  useCaseGroupDinner: "Group dinner",
  useCaseGroupDinnerDesc: "One card takes the hit tonight. Square it before anyone forgets.",
  useCaseRoadTrip: "Road trip",
  useCaseRoadTripDesc: "Gas, tolls, snacks, the motel. Add them as they happen.",
  useCaseSharedHouse: "Shared house",
  useCaseSharedHouseDesc: "Rent, groceries, utilities: one running tab for the household.",
  howItWorks: "How it works",
  step1Title: "Start a group, share one link",
  step1Desc:
    "No sign-up, nothing to install. The link is the invite, and anyone who opens it is in.",
  step2Title: "Everyone adds what they paid",
  step2Desc:
    "In any currency. Each expense freezes that day's rate, so totals never shift under you.",
  step3Title: "Settle with the fewest payments",
  step3Desc:
    "Allsquare works out who pays who, in as few payments as possible. Mark them paid and the stamp drops.",
  questionsAnswered: "Questions, answered",
  faqAccountQ: "Do I need an account to use Allsquare?",
  faqAccountA: "No. Start a group, share the link, and everyone is in. Nobody signs up, ever.",
  faqInstallQ: "Do my friends need to install anything?",
  faqInstallA:
    "No. The link opens in any browser, on any phone or laptop. Allsquare can also be added to the home screen like an app.",
  faqCurrencyQ: "How does multi-currency splitting work?",
  faqCurrencyA:
    "Add each expense in the currency you paid in. Allsquare locks that day's exchange rate, and everyone settles in the group's home currency.",
  faqSplitwiseQ: "How is Allsquare different from Splitwise?",
  faqSplitwiseA:
    "There are no accounts and nothing to install. Start a group, share the link, and everyone is in within seconds.",
  everyGroupEndsSame: "Every group ends the same way.",
  startGroupNow: "Start a group now",
  privacyPromise: "No cookies, no tracking. Your trip list stays on your device.",

  // Dashboard
  yourTrips: "Your trips",
  yourTripsDesc: "Trips you've started or opened on this device.",
  whatIsAllsquare: "What is Allsquare?",
  dashboardMetaTitle: "Your trips | Allsquare",

  // CreateGroup
  createGroupMetaTitle: "Start a group | Allsquare",
  createGroupHeroTitle: "Split anything on a trip. End up all square.",
  createGroupHeroDesc:
    "No sign-up. Any currency. Share one link, everyone adds what they paid, and Allsquare works out who owes who.",
  tripTitle: "Trip title",
  tripTitlePlaceholder: "Kyoto trip, Tahoe weekend…",
  baseCurrency: "Base currency",
  members: "Members",
  memberN: "Member {n}",
  namePlaceholder: "Name",
  removeMemberN: "Remove member {n}",
  remove: "Remove",
  addMemberRow: "Add member",
  titleMembersRequired: "Add a title and at least two members.",
  createGroupError: "Could not create the group. Try again.",
  createGroup: "Create group",

  // GroupPage
  groupPageMetaTitle: "{title} | Allsquare",
  tripFallback: "Trip",
  groupLoadError: "This group could not be loaded.",
  loading: "Loading…",
  notListedAddName: "Not listed? Add your name",
  addAndContinue: "Add & continue",
  youAreText: "You are {name}.",
  unknownMember: "a member",
  expenses: "Expenses",
  addAnExpense: "Add an expense",
  settleUpSection: "Settle up section",
  markedPaid: "Marked paid.",
  undo: "Undo",

  // ExpenseForm
  editExpense: "Edit expense",
  addExpenseFormAria: "Add expense",
  addAgain: "Add again",
  whoPaid: "Who paid?",
  payerAria: "Payer",
  description: "Description",
  category: "Category",
  split: "Split",
  equal: "Equal",
  exact: "Exact",
  items: "Items",
  currency: "Currency",
  itemsLegend: "Items ({currency})",
  itemNName: "Item {n} name",
  itemNAmount: "Item {n} amount",
  itemPlaceholder: "Item",
  amountPlaceholder: "0.00",
  removeItemN: "Remove item {n}",
  itemNMember: "Item {n}: {name}",
  everyone: "Everyone",
  itemNEveryone: "Item {n}: everyone",
  addItem: "Add item",
  totalAmount: "Total {amount}",
  approxBase: "≈ {amount}",
  amount: "Amount",
  participants: "Participants",
  exactAmountsLegend: "Exact amounts ({currency})",
  exactAmountFor: "Exact amount for {name}",
  payerDescRequired: "Choose a payer and add a description.",
  itemNameAmountRequired: "Every item needs a name and a valid amount.",
  assignItemTo: 'Assign "{name}" to at least one person.',
  addAtLeastOneItem: "Add at least one item.",
  invalidAmount: "Enter a valid amount.",
  pickParticipant: "Pick at least one participant.",
  enterExactAmounts: "Enter each person's exact amount.",
  saveExpenseError: "Could not save the expense.",
  addExpenseError: "Could not add the expense.",
  cancel: "Cancel",
  saveChanges: "Save changes",

  // MemberPicker
  whoAreYou: "Who are you?",
  tapYourName: "Tap your name below so this device knows which balance is yours.",
  imMember: "I'm {name}",

  // AddMember
  addMemberField: "Add member",
  addMemberSubmitDefault: "Add member",
  addMemberFormTitle: "Add member",
  enterName: "Enter a name.",
  addMemberError: "Could not add the member.",
  memberName: "Name",

  // RenameTrip
  renameTripTitle: "Rename trip",
  tripName: "Trip name",
  enterTripName: "Enter a trip name.",
  renameTripError: "Could not rename the trip.",
  saveName: "Save name",

  // PaymentInfo
  paymentWhere: "Where should people pay you?",
  paymentPlaceholder: "@venmo, paypal.me/you, $cashtag, or any link",
  paymentHelp: "Shown as a Pay button next to transfers owed to you. Leave empty to remove it.",
  paymentInfoError: "Could not save your payment info.",
  savePaymentInfo: "Save payment info",
  paymentInfoForm: "Payment info",

  // TripMenu
  tripMenu: "Trip menu",
  tripOptions: "Trip options",
  renameTripMenuItem: "Rename trip…",
  shareMenuItem: "Share…",
  addMemberMenuItem: "Add member…",
  yourPaymentInfoMenuItem: "Your payment info…",
  roundSettleUp: "Round settle-up",
  roundingExact: "Exact",
  roundingNearest1: "Nearest 1",
  roundingNearest10: "Nearest 10",
  roundingNearest100: "Nearest 100",
  shareTripTitle: "Share this trip",
  shareTripDesc: "Anyone with the link can open the trip. No account needed.",
  yourPaymentInfoTitle: "Your payment info",
  language: "Language",

  // SettleUp
  settleUp: "Settle up",
  calculating: "Calculating…",
  allSquareMessage: "Everyone is all square.",
  allSquareStamp: "All square",
  notYetSquareStamp: "Not yet square",

  // SettleRow
  pay: "Pay",
  payAria: "Pay {name}",
  copied: "Copied!",
  payInfo: "Pay info",
  copyPaymentInfoAria: "Copy {name}'s payment info",
  saving: "Saving…",
  markPaid: "Mark paid",
  markPaidAria: "Mark {from} paid {to}",
  recordPaymentError: "Could not record the payment.",

  // MemberTotals
  totals: "Totals",
  paidHeader: "Paid",
  shareHeader: "Share",

  // SpendingBreakdown
  spending: "Spending",

  // ShareSummary
  preparing: "Preparing…",
  shareTripSummary: "Share trip summary",

  // ExpenseCard
  expensePaidSuffix: " paid",
  noExpensesYet: "No expenses yet.",
  copyLink: "Copy link",
  tripStatusChecking: "Checking…",
  tripStatusUnavailable: "Couldn't load",
  tripStatusSettled: "Settled",
  tripStatusToSettleOne: "1 payment to settle",
  tripStatusToSettle: "{n} payments to settle",
  youAreOwedAmount: "You are owed {amount}",
  youOweAmount: "You owe {amount}",
  youAreAllSquare: "You are all square",
  removeTrip: "Remove {title}",
  repaymentTitle: "{from} paid {to}",
  edit: "Edit",
  editAria: "Edit {description}",
  delete: "Delete",
  deleteAria: "Delete {description}",

  // InstallHint
  addToHomeScreen: "Add Allsquare to your home screen",

  // Categories (ids/emoji never change; only these display labels do)
  catFood: "Food",
  catDrinks: "Drinks",
  catTransport: "Transport",
  catLodging: "Lodging",
  catActivities: "Activities",
  catGroceries: "Groceries",
  catShopping: "Shopping",
  catOther: "Other",

  // Page metadata (index.html's static tags keep DEFAULT_META verbatim;
  // this pair is what routes pass through t() for the localized document).
  metaTitle: "Allsquare | Split group bills with no sign-up",
  metaDescription:
    "Group bill splitter with no sign-up. Share one link, add expenses in any currency, and settle with the fewest payments. A Splitwise alternative for trips, dinners, and shared houses.",
} as const
