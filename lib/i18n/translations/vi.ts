// Vietnamese translations for ABG Alumni Connect
import type { Translations } from './en';

export const vi: Translations = {
  // Common
  common: {
    loading: 'Đang tải nè...',
    submit: 'Gửi',
    cancel: 'Thôi',
    error: 'Có biến rồi (Lỗi)',
    required: 'Cái này bắt buộc nha',
  },

  // Navigation
  nav: {
    brand: 'ABG Alumni Connect',
    join: 'Nhập hội',
    findConnection: 'Kiếm kèo kết nối',
    profile: 'Hồ sơ',
    history: 'Lịch sử',
  },

  // Footer
  footer: {
    community: 'Hội anh chị em ABG Alumni',
  },

  // Landing page
  landing: {
    title: 'Kết nối với anh chị em ABG',
    subtitle: 'Tìm đúng người, đúng việc trong ổ nhóm mình. Ghép đôi với những người anh em có thể gỡ rối cho bạn.',
    joinCard: {
      title: 'Nhập hội ngay',
      description: 'Lên cái hồ sơ để mọi người biết bạn có võ gì.',
    },
    findCard: {
      title: 'Tìm người giúp',
      description: 'Cần gì cứ nói, để hệ thống tìm người hợp cạ cho bạn.',
    },
    about: {
      title: 'ABG Alumni Connect là gì?',
      description: 'Nền tảng kết nối riêng tư dành riêng cho anh chị em ABG Alumni để giao lưu, hợp tác và hỗ trợ nhau qua hệ thống ghép đôi AI.',
      benefit1Title: 'Mạng lưới độc quyền',
      benefit1Desc: 'Tiếp cận cộng đồng chọn lọc ~300 alumni ABG từ nhiều ngành nghề và chuyên môn.',
      benefit2Title: 'Ghép đôi bằng AI',
      benefit2Desc: 'AI phân tích nhu cầu của bạn và tìm những người phù hợp nhất có thể giúp được.',
      benefit3Title: 'Kết nối uy tín',
      benefit3Desc: 'Toàn bộ thành viên đều là ABG alumni đã xác minh, đảm bảo chất lượng và kết nối chân thực.',
    },
    howItWorks: {
      title: 'Cách thức hoạt động',
      subtitle: 'Kết nối chỉ trong 3 bước đơn giản',
      step1Title: 'Tạo hồ sơ',
      step1Desc: 'Đăng ký bằng Google, điền chuyên môn và cho anh em biết bạn có thể giúp gì.',
      step2Title: 'Mô tả nhu cầu',
      step2Desc: 'Cho biết bạn cần gì - tư vấn, giới thiệu, hay hợp tác đều được.',
      step3Title: 'Được ghép và kết nối',
      step3Desc: 'AI tìm người phù hợp nhất và gửi email giới thiệu cho cả hai bên.',
    },
    // Email check section translations
    emailCheck: {
      checkButton: 'Kiểm tra & Tiếp tục',
      googleButton: 'Đăng nhập với Google',
      switchToSignup: 'Chưa có tài khoản? Đăng ký',
      switchToSignin: 'Đã là thành viên? Đăng nhập',
      tryDifferentEmail: 'Thử email khác',
    },
    // Auth section translations
    authSection: {
      returningTitle: 'Thành viên cũ',
      returningDesc: 'Đã đăng ký rồi? Nhập email để đăng nhập.',
      joinTitle: 'Gia nhập cộng đồng',
      joinDesc: 'Mới tham gia ABG Connect? Bắt đầu đăng ký tại đây.',
    },
    // Public search translations
    publicSearch: {
      title: 'Tìm kết nối',
      subtitle: 'Thử tính năng ghép đôi AI - không cần đăng ký',
      placeholder: 'VD: Tôi cần chuyên gia marketing cho startup...',
      searchButton: 'Tìm',
      signInToSee: 'Đăng nhập để xem đầy đủ hồ sơ',
      teaser: 'Đăng nhập để xem đầy đủ hồ sơ và kết nối trực tiếp',
    },
    // Divider
    divider: 'HOẶC',
  },

  // Onboarding page
  onboard: {
    title: 'Gia nhập ABG Alumni Connect',
    subtitle: 'Tạo hồ sơ để giao lưu với anh chị em khác',
    form: {
      fullName: 'Tên tuổi đầy đủ',
      fullNamePlaceholder: 'Nguyễn Văn A',
      email: 'Email',
      emailPlaceholder: 'email@example.com',
      role: 'Đang làm chức gì',
      rolePlaceholder: 'Product Manager',
      company: 'Ở công ty nào',
      companyPlaceholder: 'Công ty ABC',
      expertise: 'Món tủ của bạn (Chuyên môn)',
      expertisePlaceholder: 'VD: Rành về gọi vốn, trùm sales, chiến lược...',
      canHelpWith: 'Bạn có thể giúp anh em việc gì?',
      canHelpWithPlaceholder: 'VD: Review pitch deck, kết nối nhà đầu tư, tư vấn nghề...',
      lookingFor: 'Bạn đang cần tìm gì?',
      lookingForPlaceholder: 'VD: Tìm Co-founder kỹ thuật, cần mối bán hàng B2B...',
      avatar: 'Bấm để up ảnh đại diện (tùy chọn)',
      abgClass: 'Lớp ABG',
      abgClassPlaceholder: 'VD: ABG 22, ABG Alpha 2023',
      abgClassHelp: 'Nhập tên lớp ABG của bạn (admin sẽ xác minh)',
      nicknameSection: 'Biệt danh (Tùy chọn)',
      nickname: 'Biệt danh',
      nicknamePlaceholder: 'VD: Johnny',
      nicknameHelp: 'Tên thân mật để mọi người gọi bạn',
      displayNicknameWhere: 'Hiển thị biệt danh thay vì tên đầy đủ:',
      displayInSearch: 'Trong kết quả tìm kiếm',
      displayInMatch: 'Trong gợi ý ghép đôi',
      displayInEmail: 'Trong email giới thiệu',
      openToWork: 'Tôi đang tìm cơ hội mới (Open to work)',
      jobPreferences: 'Bạn đang tìm công việc như nào?',
      jobPreferencesPlaceholder: 'VD: Senior Developer, Hybrid, lương >$2000...',
      hiring: 'Tôi đang tuyển dụng (Hiring)',
      hiringPreferences: 'Bạn đang tìm ứng viên như nào?',
      hiringPreferencesPlaceholder: 'VD: Marketing Manager, kinh nghiệm 3 năm, tiếng Anh tốt...',
      sectionCareer: 'Cơ hội nghề nghiệp (Tùy chọn)',
      gender: 'Giới tính',
      genderFemale: 'Nữ',
      genderMale: 'Nam',
      genderUndisclosed: 'Không tiết lộ',
      relationshipStatus: 'Tình trạng quan hệ',
      relationshipSingle: 'Độc thân',
      relationshipAvailable: 'Độc thân (Sẵn sàng hẹn hò)',
      relationshipInRelationship: 'Đang yêu',
      relationshipMarried: 'Đã kết hôn',
      relationshipPreferNotToSay: 'Không muốn chia sẻ',
      submit: 'Hoàn tất hồ sơ',
      submitting: 'Đang lên hồ sơ...',
      continueWithGoogle: 'Tiếp tục với Google',
      sendMagicLink: 'Gửi Magic Link',
      magicLinkSent: 'Magic link đã gửi! Kiểm tra email và nhấn link để tiếp tục.',
      orDivider: 'hoặc',
      emailGoogleNote: 'Email sẽ được tự động điền từ tài khoản Google của bạn',
      emailRequired: 'Nhập email để nhận magic link hoặc đăng nhập bằng Google',
    },
    success: {
      title: 'Chào mừng người anh em!',
      checkEmail: 'Check mail để xác nhận nhé.',
      generatedBio: 'Bio xịn xò AI viết cho bạn:',
      completePayment: 'Thanh toán ngay',
    },
    validation: {
      nameRequired: 'Nhớ điền tên nha',
      emailRequired: 'Email không chuẩn rồi',
      roleRequired: 'Chưa điền chức danh nè',
      companyRequired: 'Quên điền công ty rồi',
      expertiseMin: 'Kể thêm chút về món tủ đi (tối thiểu 10 ký tự)',
      canHelpMin: 'Giúp được gì kể rõ tí nha (tối thiểu 10 ký tự)',
      lookingForMin: 'Tìm gì nói rõ xíu (tối thiểu 10 ký tự)',
    },
  },

  // Request page
  request: {
    title: 'Kiếm người trợ giúp',
    subtitle: 'Cần gì cứ hú, chúng tôi sẽ tìm người hợp cạ cho bạn',
    form: {
      email: 'Email của bạn',
      emailPlaceholder: 'email@example.com',
      emailHelp: 'Nhớ dùng email đã đăng ký nhé',
      requestText: 'Đang bí ở đâu / Cần giúp gì?',
      requestTextPlaceholder: 'Mô tả kỹ kỹ chút. Ví dụ: \'Em đang làm cái web B2B mà bí phần kéo khách doanh nghiệp, bác nào rành mảng sản xuất chỉ giáo em với.\'',
      submit: 'Tìm đồng đội',
      submitting: 'Đang rà soát...',
    },
    validation: {
      emailRequired: 'Email sai rồi',
      requestMin: 'Viết dài thêm tí nữa đi (tối thiểu 20 ký tự)',
      limitReached: 'Bạn đã sử dụng hết yêu cầu miễn phí. Vui lòng hoàn tất thanh toán thành viên để tiếp tục.',
    },
    errors: {
      limitReached: 'Bạn đã sử dụng hết yêu cầu miễn phí. Vui lòng hoàn tất thanh toán thành viên để tiếp tục.',
      rateLimitExceeded: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
      dailyLimitReached: 'Đã đạt giới hạn yêu cầu hàng ngày. Thành viên Premium có thể thực hiện tối đa {limit} yêu cầu mỗi ngày.',
      authRequired: 'Cần đăng nhập để thực hiện yêu cầu',
    },
  },

  // Authentication
  auth: {
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    signInWith: 'Đăng nhập với {provider}',
    signInRequired: 'Vui lòng đăng nhập để tiếp tục',
    signInDescription: 'Đăng nhập để tìm kiếm kết nối phù hợp',
    accountSuspended: 'Tài khoản của bạn đã bị tạm ngưng do hoạt động đáng ngờ. Vui lòng liên hệ hỗ trợ.',
    sessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
    signedIn: 'Đã đăng nhập với {email}',
  },

  // Match results
  matches: {
    title: 'Tìm thấy {count} người hợp cạ',
    titlePlural: 'Tìm thấy {count} người hợp cạ',
    selectPrompt: 'Chọn người muốn làm quen',
    whyMatched: 'Tại sao lại hợp:',
    requestIntro: 'Nhờ giới thiệu',
    sendLoveMatch: 'Gửi yêu cầu ghép đôi',
    sendingIntro: 'Đang bắn tin...',
    footerNote: 'Cả bạn và người ấy sẽ nhận được email giới thiệu',
    rerollNote: 'Mỗi lần tìm lại sẽ tính vào lượt sử dụng của bạn.',
    aiDisclaimer: 'Kết quả được tạo bởi AI và có thể thay đổi giữa các lần tìm kiếm. Điểm tương thích chỉ mang tính tham khảo.',
    showMore: 'Xem thêm {count} kết quả',
    showLess: 'Thu gọn',
    runAgain: 'Tìm lại',
    refreshing: 'Đang tìm lại...',
    startNewSearch: 'Tìm kiếm mới',
    noMoreMatches: 'Không còn kết quả phù hợp. Hãy thử điều chỉnh yêu cầu.',
    matchScore: '{score}% phù hợp',
    roleAt: '{role} tại {company}',
    anonymous: 'Ẩn danh',
    addIntroMessage: 'Thêm lời giới thiệu cá nhân (tùy chọn)',
    introLabel: 'Lời giới thiệu (tùy chọn, tối đa 500 ký tự)',
    introPlaceholder: 'Viết lời giới thiệu bản thân...',
    // Love match profile labels
    aboutLabel: 'Giới thiệu:',
    interestsLabel: 'Sở thích:',
    valuesLabel: 'Giá trị:',
    idealDayLabel: 'Ngày lý tưởng:',
    lookingForLabel: 'Tìm kiếm:',
    // AI credit balance
    creditRemaining: 'Còn {remaining}/{total} lượt',
    creditFree: 'Miễn phí',
    creditPremium: 'Premium',
    success: {
      title: 'Đã bắn tin giới thiệu!',
      message: 'Đã gửi mail cho cả hai rồi nhé. Check inbox ngay và luôn!',
    },
  },

  // Error page
  errorPage: {
    title: 'Toang rồi',
    message: 'Gặp lỗi gì đó rồi. Thử lại phát xem sao.',
    retry: 'Thử lại',
  },

  // Email templates
  email: {
    onboarding: {
      subject: 'Welcome gia nhập ABG Alumni Connect!',
      greeting: 'Chào {name},',
      bioIntro: 'Hồ sơ đã lên sóng. Đây là bio của bạn:',
      canFind: 'Anh em khác giờ có thể tìm thấy bạn rồi đó.',
      readyToConnect: 'Muốn tìm kèo kết nối? Vào app ngay thôi.',
      regards: 'Thân ái,',
      signature: 'ABG Alumni Connect',
    },
    intro: {
      subject: 'ABG Connect: {requesterName} muốn bắt sóng với bạn',
      greeting: 'Chào {targetName},',
      lookingFor: '{requesterName} ({requesterRole} tại {requesterCompany}) đang cần:',
      whyMatched: 'Lý do ghép đôi:',
      replyPrompt: 'Nếu ok thì cứ reply email này nhé - cả hai đều nhận được.',
      regards: 'Thân ái,',
      signature: 'ABG Alumni Connect',
      footer: 'Kèo này được kết nối qua ABG Alumni Connect.',
    },
  },

  // My Requests page
  myRequests: {
    title: 'Yêu cầu kết nối của tôi',
    subtitle: 'Xem và theo dõi các yêu cầu kết nối',
    enterEmail: 'Nhập email để xem yêu cầu',
    emailPlaceholder: 'email@example.com',
    viewRequests: 'Xem yêu cầu của tôi',
    loading: 'Đang tải dữ liệu...',
    noRequests: 'Chưa có yêu cầu kết nối nào',
    noRequestsHelp: 'Gửi yêu cầu kết nối để bắt đầu',
    requestOn: 'Yêu cầu ngày',
    status: {
      pending: 'Đang chờ',
      matched: 'Đã ghép',
      connected: 'Đã kết nối',
      declined: 'Từ chối',
    },
    matchedWith: 'Đã ghép với',
    connectedWith: 'Đã kết nối với',
    potentialMatches: 'Các lựa chọn khả thi',
    backToRequests: 'Quay lại danh sách',
  },

  // Language switcher
  language: {
    en: 'English',
    vi: 'Tiếng Việt',
  },

  // Payment
  payment: {
    title: 'Hoàn tất thành viên',
    qrPlaceholder: 'Mã QR',
    qrComingSoon: 'Mã QR sắp có',
    bankDetails: 'Thông tin chuyển khoản',
    bank: 'Ngân hàng',
    accountNumber: 'Số tài khoản',
    accountName: 'Tên tài khoản',
    amount: 'Số tiền',
    reference: 'Nội dung chuyển khoản',
    instructions: 'Sau khi chuyển khoản, bấm "Đã thanh toán". Admin sẽ xác minh và kích hoạt tài khoản Premium trong vòng 24 giờ.',
    confirmPayment: 'Đã thanh toán',
    confirming: 'Đang xác nhận...',
    cancel: 'Hủy',
    confirmationTitle: 'Đã gửi xác nhận!',
    confirmationMessage: 'Admin sẽ xác minh thanh toán và kích hoạt tài khoản Premium trong vòng 24 giờ.',
    findConnections: 'Tìm kết nối ngay',
  },

  // Dating
  dating: {
    professionalNetwork: 'Kết nối công việc',
    findPartner: 'Tìm người yêu ❤️',
    idealMatch: 'Mô tả người trong mộng ❤️',
    idealMatchPlaceholder: 'Ví dụ: Mình tìm người thích đi du lịch, yêu thiên nhiên, thích nói chuyện sâu sắc...',
    findMyMatch: 'Tìm người yêu ngay ❤️',
    searching: 'Đang tìm người ấy...',
    findJob: 'Tìm việc 💼',
    findCandidates: 'Tuyển dụng 🤝',
    jobPreferences: 'Bạn đang tìm công việc như nào?',
    jobPreferencesPlaceholder: 'Ví dụ: Tôi muốn tìm công việc Product Manager ở công ty công nghệ...',
    hiringPreferences: 'Bạn đang tìm ứng viên như nào?',
    hiringPreferencesPlaceholder: 'Ví dụ: Cần tuyển Senior React Dev, kinh nghiệm 3 năm...',
    findJobBtn: 'Tìm việc ngay',
    findCandidatesBtn: 'Tìm ứng viên ngay',
    // Profile completion
    completeProfile: 'Hoàn thiện hồ sơ',
    completeProfileDescription: 'Để sử dụng tính năng hẹn hò, vui lòng cung cấp giới tính và trạng thái hẹn hò.',
    selectGender: 'Chọn giới tính',
    selectStatus: 'Chọn trạng thái',
    genderNote: 'Lưu ý: "Không tiết lộ" không khả dụng cho tính năng hẹn hò',
    statusNote: 'Chỉ thành viên độc thân mới có thể sử dụng tính năng hẹn hò',
    saveAndContinue: 'Lưu & Tiếp tục',
    // Category tab descriptions
    loveDesc: 'Tìm người yêu trong mạng lưới alumni đã xác minh',
    jobDesc: 'Khám phá cơ hội việc làm hoặc kết nối với mentor/nhà tuyển dụng',
    hiringDesc: 'Tìm kiếm nhân tài cho vị trí tuyển dụng',
    partnerDesc: 'Kết nối hợp tác kinh doanh hoặc mở rộng mạng lưới',
  },

  // Profile page
  profile: {
    title: 'Hồ sơ của tôi',
    editProfile: 'Chỉnh sửa hồ sơ',
    cancelEdit: 'Hủy',
    saveChanges: 'Lưu thay đổi',
    memberSince: 'Thành viên từ',
    sections: {
      about: 'Giới thiệu',
      expertise: 'Chuyên môn & Kỹ năng',
      career: 'Cơ hội nghề nghiệp',
      personal: 'Thông tin cá nhân',
      social: 'Liên kết mạng xã hội',
      privacy: 'Cài đặt riêng tư',
      dating: 'Hồ sơ hẹn hò',
    },
    membership: {
      premium: 'Premium',
      basic: 'Cơ bản',
      pending: 'Đang chờ',
      'grace-period': 'Thời gian gia hạn',
      expired: 'Hết hạn',
      expiresOn: 'Hết hạn vào',
    },
    privacy: {
      displayNicknameInSearch: 'Hiển thị biệt danh thay vì tên đầy đủ trong kết quả tìm kiếm',
      displayNicknameInMatch: 'Hiển thị biệt danh thay vì tên đầy đủ trong kết quả ghép đôi',
      displayNicknameInEmail: 'Hiển thị biệt danh thay vì tên đầy đủ trong email giới thiệu',
    },
    datingDescription: 'Điền phần này để hoàn thiện hồ sơ hẹn hò của bạn.',
    dating: {
      selfDescription: 'Mô tả bản thân trong 3 từ',
      selfDescriptionPlaceholder: 'VD: Sáng tạo, Thích phiêu lưu, Chu đáo',
      truthLie: '2 Sự thật & 1 Lời nói dối',
      truthLiePlaceholder: 'Chia sẻ 2 sự thật và 1 lời nói dối về bản thân',
      idealDay: 'Ngày lý tưởng của tôi',
      idealDayPlaceholder: 'Mô tả ngày hoàn hảo của bạn...',
      qualitiesLookingFor: 'Phẩm chất tôi tìm kiếm',
      qualitiesPlaceholder: 'Bạn tìm kiếm phẩm chất gì ở đối tác?',
      coreValues: 'Giá trị cốt lõi của tôi',
      coreValuesPlaceholder: 'Những giá trị nào quan trọng nhất với bạn?',
      dealBreakers: 'Điều không thể chấp nhận',
      dealBreakersPlaceholder: 'Điều gì là không thể chấp nhận trong mối quan hệ?',
      interests: 'Sở thích & Thú vui',
      interestsPlaceholder: 'Bạn thích làm gì?',
      message: 'Lời nhắn đến người phù hợp',
      messagePlaceholder: 'Viết lời nhắn đến người có thể quan tâm đến bạn...',
      otherShare: 'Còn gì muốn chia sẻ không?',
      otherSharePlaceholder: 'Thông tin khác...',
    },
  },

  // News pages
  news: {
    pageTitle: 'Tin Tức & Cập Nhật Cộng Đồng',
    pageSubtitle: 'Cập nhật tin tức, sự kiện và cơ hội mới nhất từ cộng đồng ABG Alumni.',
    // Category filter
    categories: {
      all: 'Tất cả',
      edu: 'Giáo dục',
      business: 'Kinh doanh',
      event: 'Sự kiện',
      course: 'Khoá học',
      announcement: 'Thông báo',
    },
    // Info bar
    showingArticles: 'Đang hiển thị bài viết {category}',
    itemCount: '{count} bài',
    // Card actions
    readFullStory: 'Đọc bài đầy đủ',
    loadMore: 'Xem thêm bài viết',
    noArticles: 'Không có bài viết nào trong danh mục này.',
    // Article detail
    backToNews: 'Quay lại tin tức',
    published: 'Đăng ngày',
    by: 'Bởi',
    shareArticle: 'Chia sẻ bài viết',
    shareTwitter: 'Chia sẻ lên Twitter',
    shareLinkedIn: 'Chia sẻ lên LinkedIn',
    copyLink: 'Sao chép liên kết',
    linkCopied: 'Đã sao chép!',
    // Article navigation
    previousArticle: 'Bài trước',
    nextArticle: 'Bài tiếp theo',
    // Author
    communityManagement: 'Quản lý Cộng đồng',
  },

  // History page
  history: {
    title: 'Lịch sử kết nối',
    myRequests: 'Yêu cầu của tôi',
    incomingMatches: 'Người kết nối với tôi',
    noRequests: 'Chưa có yêu cầu kết nối nào',
    noIncoming: 'Chưa có ai kết nối với bạn',
    theyWereLookingFor: 'Họ đang tìm:',
    filterAll: 'Tất cả trạng thái',
    dateAll: 'Tất cả thời gian',
    dateLast7: '7 ngày qua',
    dateLast30: '30 ngày qua',
    status: {
      pending: 'Đang chờ',
      matched: 'Đã ghép',
      connected: 'Đã kết nối',
      declined: 'Từ chối',
    },
  },
} as const;
