// Mock data for Inbox UI (009)
// Used during development while webhook + real data pipeline is wired (task 011+)

export type MockAgent = {
  id: string;
  name: string;
  nameAr: string;
  role: "admin" | "supervisor" | "agent";
  avatarInitials: string;
};

export type MockContact = {
  id: string;
  displayName: string;
  phone: string;
  avatarInitials: string;
};

export type MockMessage = {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  content: string;
  isInternalNote: boolean;
  authorId: string | undefined;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: number;
};

export type MockConversation = {
  id: string;
  contact: MockContact;
  assignedAgent: MockAgent | undefined;
  status: "open" | "pending" | "resolved";
  lastMessagePreview: string;
  lastMessageAt: number;
  unreadCount: number;
};

// ─── Agents ──────────────────────────────────────────────────────────────────

export const MOCK_AGENTS: MockAgent[] = [
  {
    id: "agent_admin_01",
    name: "Ahmed Hassan",
    nameAr: "أحمد حسن",
    role: "admin",
    avatarInitials: "أح",
  },
  {
    id: "agent_supervisor_01",
    name: "Sara Mohamed",
    nameAr: "سارة محمد",
    role: "supervisor",
    avatarInitials: "سم",
  },
  {
    id: "agent_01",
    name: "Omar Khalil",
    nameAr: "عمر خليل",
    role: "agent",
    avatarInitials: "عخ",
  },
];

// ─── Contacts ─────────────────────────────────────────────────────────────────

const MOCK_CONTACTS: MockContact[] = [
  { id: "c01", displayName: "محمد علي", phone: "+201012345678", avatarInitials: "مع" },
  { id: "c02", displayName: "فاطمة الزهراء", phone: "+201198765432", avatarInitials: "فز" },
  { id: "c03", displayName: "Khaled Al-Rashidi", phone: "+966501234567", avatarInitials: "KR" },
  { id: "c04", displayName: "نورة السعيد", phone: "+966559876543", avatarInitials: "نس" },
  { id: "c05", displayName: "Ahmed Abdullah", phone: "+971501234567", avatarInitials: "AA" },
  { id: "c06", displayName: "ريم الحربي", phone: "+966551122334", avatarInitials: "رح" },
  { id: "c07", displayName: "يوسف طارق", phone: "+201123456789", avatarInitials: "يط" },
  { id: "c08", displayName: "Mona Saeed", phone: "+201234567890", avatarInitials: "MS" },
  { id: "c09", displayName: "عبدالله الغامدي", phone: "+966504433221", avatarInitials: "عغ" },
  { id: "c10", displayName: "Layla Hassan", phone: "+971521234567", avatarInitials: "LH" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minutesAgo(n: number): number {
  return Date.now() - n * 60 * 1000;
}

function hoursAgo(n: number): number {
  return Date.now() - n * 60 * 60 * 1000;
}

function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

// ─── Conversations ────────────────────────────────────────────────────────────

export const MOCK_CONVERSATIONS: MockConversation[] = [
  {
    id: "conv_01",
    contact: MOCK_CONTACTS[0],
    assignedAgent: MOCK_AGENTS[2],
    status: "open",
    lastMessagePreview: "أين طلبي؟ لم أستلمه بعد",
    lastMessageAt: minutesAgo(2),
    unreadCount: 3,
  },
  {
    id: "conv_02",
    contact: MOCK_CONTACTS[1],
    assignedAgent: undefined,
    status: "open",
    lastMessagePreview: "أريد الاستفسار عن سعر المنتج",
    lastMessageAt: minutesAgo(15),
    unreadCount: 1,
  },
  {
    id: "conv_03",
    contact: MOCK_CONTACTS[2],
    assignedAgent: MOCK_AGENTS[1],
    status: "pending",
    lastMessagePreview: "I need to change my delivery address",
    lastMessageAt: hoursAgo(1),
    unreadCount: 0,
  },
  {
    id: "conv_04",
    contact: MOCK_CONTACTS[3],
    assignedAgent: MOCK_AGENTS[0],
    status: "open",
    lastMessagePreview: "المنتج وصل تالف، أريد استبدال",
    lastMessageAt: hoursAgo(2),
    unreadCount: 2,
  },
  {
    id: "conv_05",
    contact: MOCK_CONTACTS[4],
    assignedAgent: MOCK_AGENTS[2],
    status: "resolved",
    lastMessagePreview: "Thank you for your help!",
    lastMessageAt: hoursAgo(5),
    unreadCount: 0,
  },
  {
    id: "conv_06",
    contact: MOCK_CONTACTS[5],
    assignedAgent: undefined,
    status: "open",
    lastMessagePreview: "كيف أتتبع شحنتي؟",
    lastMessageAt: hoursAgo(8),
    unreadCount: 1,
  },
  {
    id: "conv_07",
    contact: MOCK_CONTACTS[6],
    assignedAgent: MOCK_AGENTS[2],
    status: "pending",
    lastMessagePreview: "لم تصلني رسالة التأكيد",
    lastMessageAt: daysAgo(1),
    unreadCount: 0,
  },
  {
    id: "conv_08",
    contact: MOCK_CONTACTS[7],
    assignedAgent: MOCK_AGENTS[1],
    status: "resolved",
    lastMessagePreview: "Great service, will order again",
    lastMessageAt: daysAgo(2),
    unreadCount: 0,
  },
  {
    id: "conv_09",
    contact: MOCK_CONTACTS[8],
    assignedAgent: undefined,
    status: "open",
    lastMessagePreview: "هل لديكم عروض هذا الأسبوع؟",
    lastMessageAt: daysAgo(3),
    unreadCount: 0,
  },
  {
    id: "conv_10",
    contact: MOCK_CONTACTS[9],
    assignedAgent: MOCK_AGENTS[0],
    status: "resolved",
    lastMessagePreview: "Issue resolved, thanks!",
    lastMessageAt: daysAgo(5),
    unreadCount: 0,
  },
];

// ─── Messages (per conversation) ─────────────────────────────────────────────

export const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  conv_01: [
    {
      id: "m01_01",
      conversationId: "conv_01",
      direction: "inbound",
      content: "السلام عليكم، طلبت منذ ٣ أيام ولم يصل",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: daysAgo(1),
    },
    {
      id: "m01_02",
      conversationId: "conv_01",
      direction: "outbound",
      content: "وعليكم السلام، سنتحقق من حالة طلبك الآن",
      isInternalNote: false,
      authorId: "agent_01",
      status: "read",
      timestamp: daysAgo(1) + 5 * 60 * 1000,
    },
    {
      id: "m01_03",
      conversationId: "conv_01",
      direction: "outbound",
      content: "ملاحظة: العميل اشترى من حملة الجمعة السوداء - تحقق من قسم الشحن",
      isInternalNote: true,
      authorId: "agent_supervisor_01",
      status: "read",
      timestamp: daysAgo(1) + 10 * 60 * 1000,
    },
    {
      id: "m01_04",
      conversationId: "conv_01",
      direction: "inbound",
      content: "أرجو الإسراع، أحتاجه اليوم",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: minutesAgo(30),
    },
    {
      id: "m01_05",
      conversationId: "conv_01",
      direction: "inbound",
      content: "أين طلبي؟ لم أستلمه بعد",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: minutesAgo(2),
    },
  ],

  conv_02: [
    {
      id: "m02_01",
      conversationId: "conv_02",
      direction: "inbound",
      content: "مرحباً، أريد الاستفسار عن سعر منتج",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: hoursAgo(3),
    },
    {
      id: "m02_02",
      conversationId: "conv_02",
      direction: "outbound",
      content: "أهلاً، تفضل بذكر المنتج وسنرسل لك السعر",
      isInternalNote: false,
      authorId: "agent_01",
      status: "delivered",
      timestamp: hoursAgo(2),
    },
    {
      id: "m02_03",
      conversationId: "conv_02",
      direction: "inbound",
      content: "أريد الاستفسار عن سعر المنتج",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: minutesAgo(15),
    },
  ],

  conv_03: [
    {
      id: "m03_01",
      conversationId: "conv_03",
      direction: "inbound",
      content: "Hi, I placed an order but I need to change the delivery address",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: hoursAgo(3),
    },
    {
      id: "m03_02",
      conversationId: "conv_03",
      direction: "outbound",
      content: "Sure! Please share the new address and the order number",
      isInternalNote: false,
      authorId: "agent_supervisor_01",
      status: "delivered",
      timestamp: hoursAgo(2),
    },
    {
      id: "m03_03",
      conversationId: "conv_03",
      direction: "inbound",
      content: "Order #45231. New address: King Fahd Road, Riyadh",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: hoursAgo(2) + 5 * 60 * 1000,
    },
    {
      id: "m03_04",
      conversationId: "conv_03",
      direction: "outbound",
      content: "ملاحظة: تم إرسال الطلب للمستودع - انتظر تأكيد التغيير",
      isInternalNote: true,
      authorId: "agent_supervisor_01",
      status: "delivered",
      timestamp: hoursAgo(1) + 30 * 60 * 1000,
    },
    {
      id: "m03_05",
      conversationId: "conv_03",
      direction: "inbound",
      content: "I need to change my delivery address",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: hoursAgo(1),
    },
  ],

  conv_04: [
    {
      id: "m04_01",
      conversationId: "conv_04",
      direction: "inbound",
      content: "المنتج الذي استلمته كان تالفاً تماماً",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: hoursAgo(5),
    },
    {
      id: "m04_02",
      conversationId: "conv_04",
      direction: "outbound",
      content: "نأسف جداً لذلك. هل يمكنك إرسال صور للمنتج التالف؟",
      isInternalNote: false,
      authorId: "agent_admin_01",
      status: "read",
      timestamp: hoursAgo(4),
    },
    {
      id: "m04_03",
      conversationId: "conv_04",
      direction: "inbound",
      content: "المنتج وصل تالف، أريد استبدال",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: hoursAgo(2),
    },
  ],

  conv_05: [
    {
      id: "m05_01",
      conversationId: "conv_05",
      direction: "inbound",
      content: "Hello, I have an issue with my account",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: hoursAgo(7),
    },
    {
      id: "m05_02",
      conversationId: "conv_05",
      direction: "outbound",
      content: "Hi! What seems to be the issue?",
      isInternalNote: false,
      authorId: "agent_01",
      status: "read",
      timestamp: hoursAgo(6),
    },
    {
      id: "m05_03",
      conversationId: "conv_05",
      direction: "inbound",
      content: "Can't login, keeps saying wrong password",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: hoursAgo(6),
    },
    {
      id: "m05_04",
      conversationId: "conv_05",
      direction: "outbound",
      content: "Try resetting your password via the link we just sent",
      isInternalNote: false,
      authorId: "agent_01",
      status: "read",
      timestamp: hoursAgo(5) + 30 * 60 * 1000,
    },
    {
      id: "m05_05",
      conversationId: "conv_05",
      direction: "inbound",
      content: "Thank you for your help!",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: hoursAgo(5),
    },
  ],

  conv_06: [
    {
      id: "m06_01",
      conversationId: "conv_06",
      direction: "inbound",
      content: "مرحباً، كيف أتتبع شحنتي؟",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: hoursAgo(8),
    },
    {
      id: "m06_02",
      conversationId: "conv_06",
      direction: "inbound",
      content: "كيف أتتبع شحنتي؟",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: hoursAgo(8) + 2 * 60 * 1000,
    },
  ],

  conv_07: [
    {
      id: "m07_01",
      conversationId: "conv_07",
      direction: "inbound",
      content: "أحمد بك، اشتريت بالأمس ولم تصلني رسالة التأكيد",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: daysAgo(1) + 2 * 60 * 60 * 1000,
    },
    {
      id: "m07_02",
      conversationId: "conv_07",
      direction: "outbound",
      content: "سيتم إعادة إرسالها خلال دقائق، تأكد من البريد المهمل",
      isInternalNote: false,
      authorId: "agent_01",
      status: "read",
      timestamp: daysAgo(1) + 2 * 60 * 60 * 1000 + 10 * 60 * 1000,
    },
    {
      id: "m07_03",
      conversationId: "conv_07",
      direction: "inbound",
      content: "لم تصلني رسالة التأكيد",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: daysAgo(1),
    },
  ],

  conv_08: [
    {
      id: "m08_01",
      conversationId: "conv_08",
      direction: "inbound",
      content: "The product quality is amazing",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: daysAgo(2) + 3 * 60 * 60 * 1000,
    },
    {
      id: "m08_02",
      conversationId: "conv_08",
      direction: "outbound",
      content: "Thank you so much! We're glad you're happy 😊",
      isInternalNote: false,
      authorId: "agent_supervisor_01",
      status: "read",
      timestamp: daysAgo(2) + 4 * 60 * 60 * 1000,
    },
    {
      id: "m08_03",
      conversationId: "conv_08",
      direction: "inbound",
      content: "Great service, will order again",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: daysAgo(2),
    },
  ],

  conv_09: [
    {
      id: "m09_01",
      conversationId: "conv_09",
      direction: "inbound",
      content: "هل لديكم عروض هذا الأسبوع؟",
      isInternalNote: false,
      authorId: undefined,
      status: "delivered",
      timestamp: daysAgo(3),
    },
  ],

  conv_10: [
    {
      id: "m10_01",
      conversationId: "conv_10",
      direction: "inbound",
      content: "I received the wrong item",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: daysAgo(6),
    },
    {
      id: "m10_02",
      conversationId: "conv_10",
      direction: "outbound",
      content: "We're sorry about that. We'll send the correct item immediately",
      isInternalNote: false,
      authorId: "agent_admin_01",
      status: "read",
      timestamp: daysAgo(5) + 2 * 60 * 60 * 1000,
    },
    {
      id: "m10_03",
      conversationId: "conv_10",
      direction: "inbound",
      content: "Issue resolved, thanks!",
      isInternalNote: false,
      authorId: undefined,
      status: "read",
      timestamp: daysAgo(5),
    },
  ],
};
