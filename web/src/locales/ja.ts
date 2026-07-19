import type { MessageKey } from "../lib/i18n"

// Natural, polite-casual Japanese (です/ます調 for sentences, short labels for
// buttons). Record<MessageKey, string> means TypeScript errors if this ever
// drifts from locales/en.ts's key set, in either direction.
export const ja: Record<MessageKey, string> = {
  // App shell
  appTagline: "割り勘・精算・オールスクエア",

  // Landing
  heroLine1: "なんでも割り勘。",
  heroLine2: "最後はオールスクエア。",
  heroSubtitle:
    "登録不要の割り勘アプリ。旅行や食事会、グループで共有するすべての支払いに。どんな通貨でも、リンクひとつで共有できます。",
  startGroup: "グループを作成",
  heroFeatures: "アカウント不要・Cookie不要・どんな通貨も・オフライン対応",
  madeForMoments: "こんなシーンで",
  useCaseTripAbroad: "海外旅行",
  useCaseTripAbroadDesc: "東京では円、パリではユーロ。それでも精算はひとつの通貨でまとめられます。",
  useCaseGroupDinner: "みんなでごはん",
  useCaseGroupDinnerDesc: "今夜はカード1枚で立て替え。忘れないうちに精算しましょう。",
  useCaseRoadTrip: "ロードトリップ",
  useCaseRoadTripDesc: "ガソリン代、高速料金、おやつ、宿代。その場でどんどん記録できます。",
  useCaseSharedHouse: "シェアハウス",
  useCaseSharedHouseDesc: "家賃、食料品、光熱費。ひとつの家計簿でまとめて管理。",
  howItWorks: "使い方",
  step1Title: "グループを作って、リンクを共有",
  step1Desc: "登録もインストールも不要です。リンクが招待状になり、開いた人はすぐ参加できます。",
  step2Title: "支払った分をみんなが記録",
  step2Desc: "どんな通貨でも大丈夫。記録した日のレートで固定されるので、あとから金額がぶれません。",
  step3Title: "最少の支払い回数で精算",
  step3Desc:
    "誰が誰にいくら払うべきか、Allsquareが最少の回数で計算します。支払い済みにするとスタンプが押されます。",
  questionsAnswered: "よくある質問",
  faqAccountQ: "Allsquareを使うのにアカウントは必要ですか?",
  faqAccountA:
    "いいえ、不要です。グループを作ってリンクを共有すれば、誰でもすぐに参加できます。登録は一切必要ありません。",
  faqInstallQ: "友達は何かインストールする必要がありますか?",
  faqInstallA:
    "いいえ、不要です。リンクはスマホでもパソコンでも、どんなブラウザでも開けます。アプリのようにホーム画面に追加することもできます。",
  faqCurrencyQ: "複数通貨での割り勘はどう機能しますか?",
  faqCurrencyA:
    "支払った通貨のまま記録するだけです。Allsquareがその日の為替レートを固定し、全員がグループの基準通貨で精算します。",
  faqSplitwiseQ: "AllsquareはSplitwiseと何が違いますか?",
  faqSplitwiseA:
    "アカウントもインストールも不要な点です。グループを作ってリンクを共有すれば、数秒で全員が参加できます。",
  everyGroupEndsSame: "どのグループも、最後は同じところに行き着きます。",
  startGroupNow: "今すぐグループを作成",
  privacyPromise: "Cookieもトラッキングもありません。旅行リストはあなたの端末だけに保存されます。",

  // Dashboard
  yourTrips: "あなたの旅行",
  yourTripsDesc: "この端末で作成または開いた旅行です。",
  whatIsAllsquare: "Allsquareとは?",
  dashboardMetaTitle: "あなたの旅行 | Allsquare",

  // CreateGroup
  createGroupMetaTitle: "グループを作成 | Allsquare",
  createGroupHeroTitle: "旅行の支払いをなんでも割り勘に。最後はオールスクエア。",
  createGroupHeroDesc:
    "登録不要、どんな通貨でも使えます。リンクを共有すれば、みんなが支払いを記録するだけで、誰が誰にいくら払うべきかAllsquareが計算します。",
  tripTitle: "旅行のタイトル",
  tripTitlePlaceholder: "京都旅行、タホ湖の週末…",
  baseCurrency: "基準通貨",
  members: "メンバー",
  memberN: "メンバー{n}",
  namePlaceholder: "名前",
  removeMemberN: "メンバー{n}を削除",
  remove: "削除",
  addMemberRow: "メンバーを追加",
  titleMembersRequired: "タイトルと2人以上のメンバーを入力してください。",
  createGroupError: "グループを作成できませんでした。もう一度お試しください。",
  createGroup: "グループを作成",

  // GroupPage
  groupPageMetaTitle: "{title} | Allsquare",
  tripFallback: "旅行",
  groupLoadError: "このグループを読み込めませんでした。",
  loading: "読み込み中…",
  notListedAddName: "見つからない場合は名前を追加",
  addAndContinue: "追加して続ける",
  youAreText: "あなたは{name}さんです。",
  unknownMember: "メンバー",
  expenses: "支出",
  addAnExpense: "支出を追加",
  settleUpSection: "精算セクション",
  markedPaid: "支払い済みにしました。",
  undo: "元に戻す",

  // ExpenseForm
  editExpense: "支出を編集",
  addExpenseFormAria: "支出を追加",
  addAgain: "もう一度追加",
  whoPaid: "誰が払いましたか?",
  payerAria: "支払った人",
  description: "内容",
  category: "カテゴリー",
  split: "分け方",
  equal: "均等",
  exact: "金額指定",
  items: "品目ごと",
  currency: "通貨",
  itemsLegend: "品目 ({currency})",
  itemNName: "品目{n}の名前",
  itemNAmount: "品目{n}の金額",
  itemPlaceholder: "品目",
  amountPlaceholder: "0.00",
  removeItemN: "品目{n}を削除",
  itemNMember: "品目{n}: {name}",
  everyone: "全員",
  itemNEveryone: "品目{n}: 全員",
  addItem: "品目を追加",
  totalAmount: "合計 {amount}",
  approxBase: "≈ {amount}",
  amount: "金額",
  participants: "参加者",
  exactAmountsLegend: "金額指定 ({currency})",
  exactAmountFor: "{name}さんの金額",
  payerDescRequired: "支払った人と内容を入力してください。",
  itemNameAmountRequired: "すべての品目に名前と正しい金額を入力してください。",
  assignItemTo: "「{name}」を少なくとも1人に割り当ててください。",
  addAtLeastOneItem: "品目を1つ以上追加してください。",
  invalidAmount: "正しい金額を入力してください。",
  pickParticipant: "参加者を1人以上選んでください。",
  enterExactAmounts: "各メンバーの金額を入力してください。",
  saveExpenseError: "支出を保存できませんでした。",
  addExpenseError: "支出を追加できませんでした。",
  cancel: "キャンセル",
  saveChanges: "変更を保存",

  // MemberPicker
  whoAreYou: "あなたは誰ですか?",
  tapYourName: "下から自分の名前をタップしてください。この端末があなたの残高を覚えます。",
  imMember: "{name}です",

  // AddMember
  addMemberField: "メンバーを追加",
  addMemberSubmitDefault: "追加",
  addMemberFormTitle: "メンバーを追加",
  enterName: "名前を入力してください。",
  addMemberError: "メンバーを追加できませんでした。",
  memberName: "名前",

  // RenameTrip
  renameTripTitle: "旅行名を変更",
  tripName: "旅行名",
  enterTripName: "旅行名を入力してください。",
  renameTripError: "旅行名を変更できませんでした。",
  saveName: "名前を保存",

  // PaymentInfo
  paymentWhere: "支払いはどこに送ってもらいますか?",
  paymentPlaceholder: "@venmo、paypal.me/you、$cashtag、または任意のリンク",
  paymentHelp:
    "あなたが受け取る精算の横にPayボタンとして表示されます。空欄にすると非表示になります。",
  paymentInfoError: "支払い情報を保存できませんでした。",
  savePaymentInfo: "支払い情報を保存",
  paymentInfoForm: "支払い情報",

  // TripMenu
  tripMenu: "旅行メニュー",
  tripOptions: "旅行の操作",
  renameTripMenuItem: "旅行名を変更…",
  shareMenuItem: "共有…",
  addMemberMenuItem: "メンバーを追加…",
  yourPaymentInfoMenuItem: "支払い情報…",
  roundSettleUp: "精算額の端数処理",
  roundingExact: "端数なし",
  roundingNearest1: "1単位",
  roundingNearest10: "10単位",
  roundingNearest100: "100単位",
  shareTripTitle: "この旅行を共有",
  shareTripDesc: "リンクを知っている人は誰でも開けます。アカウントは不要です。",
  yourPaymentInfoTitle: "支払い情報",
  language: "言語",

  // SettleUp
  settleUp: "精算",
  calculating: "計算中…",
  allSquareMessage: "全員の精算が完了しました。",
  allSquareStamp: "精算完了",
  notYetSquareStamp: "未精算",

  // SettleRow
  pay: "支払う",
  payAria: "{name}に支払う",
  copied: "コピーしました!",
  payInfo: "支払い先",
  copyPaymentInfoAria: "{name}の支払い情報をコピー",
  saving: "保存中…",
  markPaid: "支払い済みにする",
  markPaidAria: "{from}が{to}に支払い済みにする",
  recordPaymentError: "支払いを記録できませんでした。",

  // MemberTotals
  totals: "合計",
  paidHeader: "支払い",
  shareHeader: "負担額",

  // SpendingBreakdown
  spending: "支出内訳",

  // ShareSummary
  preparing: "準備中…",
  shareTripSummary: "旅行のまとめを共有",

  // ExpenseCard
  expensePaidSuffix: "が支払い",
  noExpensesYet: "まだ支出がありません。",
  copyLink: "リンクをコピー",
  tripStatusChecking: "確認中…",
  tripStatusUnavailable: "読み込めませんでした",
  tripStatusSettled: "精算完了",
  tripStatusToSettleOne: "残り1件の精算",
  tripStatusToSettle: "残り{n}件の精算",
  youAreOwedAmount: "あなたは{amount}を受け取れます",
  youOweAmount: "あなたは{amount}を支払います",
  youAreAllSquare: "あなたは精算済みです",
  removeTrip: "{title}を削除",
  repaymentTitle: "{from}が{to}に支払いました",
  edit: "編集",
  editAria: "{description}を編集",
  delete: "削除",
  deleteAria: "{description}を削除",

  // InstallHint
  addToHomeScreen: "Allsquareをホーム画面に追加",

  // Categories (ids/emoji never change; only these display labels do)
  catFood: "食費",
  catDrinks: "飲み物",
  catTransport: "交通",
  catLodging: "宿泊",
  catActivities: "アクティビティ",
  catGroceries: "食料品",
  catShopping: "買い物",
  catOther: "その他",

  // Page metadata
  metaTitle: "Allsquare | 登録不要のグループ割り勘アプリ",
  metaDescription:
    "登録不要のグループ割り勘アプリ。リンクを共有し、どんな通貨でも支出を記録して、最少の支払い回数で精算できます。旅行や食事会、シェアハウスにぴったりのSplitwiseの代替アプリです。",
}
