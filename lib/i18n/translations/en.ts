// English translations for ABG Alumni Connect
export const en = {
  // Common
  common: {
    loading: 'Loading...',
    submit: 'Submit',
    cancel: 'Cancel',
    error: 'Something went wrong',
    required: 'Required',
  },

  // Navigation
  nav: {
    brand: 'ABG Alumni Connect',
    join: 'Join',
    findConnection: 'Find Connection',
    profile: 'Profile',
    history: 'History',
  },

  // Footer
  footer: {
    community: 'ABG Alumni Community',
  },

  // Landing page
  landing: {
    title: 'Connect with ABG Alumni',
    subtitle: 'Find the right connections in our community. Get matched with members who can help with your specific needs.',
    joinCard: {
      title: 'Join the Network',
      description: 'Create your profile and let others know how you can help.',
    },
    findCard: {
      title: 'Find a Connection',
      description: 'Describe what you need and get matched with the right people.',
    },
    about: {
      title: 'What is ABG Alumni Connect?',
      description: 'A private networking platform exclusively for ABG Alumni members to connect, collaborate, and support each other through AI-powered matching.',
      benefit1Title: 'Exclusive Network',
      benefit1Desc: 'Access a curated community of ~300 ABG alumni across industries and expertise areas.',
      benefit2Title: 'AI-Powered Matching',
      benefit2Desc: 'Our AI analyzes your needs and matches you with the most relevant alumni who can help.',
      benefit3Title: 'Trusted Connections',
      benefit3Desc: 'All members are verified ABG alumni, ensuring quality and authentic connections.',
    },
    howItWorks: {
      title: 'How It Works',
      subtitle: 'Get connected in 3 simple steps',
      step1Title: 'Create Your Profile',
      step1Desc: 'Sign up with Google, fill in your expertise, and let others know how you can help.',
      step2Title: 'Describe Your Need',
      step2Desc: 'Tell us what you\'re looking for - whether it\'s advice, introductions, or collaboration.',
      step3Title: 'Get Matched & Connected',
      step3Desc: 'Our AI finds the best matches and facilitates email introductions between you and your matches.',
    },
    // Email check section translations
    emailCheck: {
      checkButton: 'Check & Continue',
      googleButton: 'Continue with Google',
      switchToSignup: 'Not a member? Join Community',
      switchToSignin: 'Already a member? Sign In',
      tryDifferentEmail: 'Try a different email',
    },
    // Auth section translations
    authSection: {
      returningTitle: 'Returning Member',
      returningDesc: 'Already registered? Enter your email to sign in.',
      joinTitle: 'Join Community',
      joinDesc: 'New to ABG Connect? Start your application here.',
    },
    // Public search translations
    publicSearch: {
      title: 'Find a Connection',
      subtitle: 'Try our AI matching - no signup required',
      placeholder: 'e.g., I need a marketing expert for my startup...',
      searchButton: 'Search',
      signInToSee: 'Sign in to see full profiles',
      teaser: 'Sign in to unlock full profiles and connect directly',
    },
    // Divider
    divider: 'OR',
  },

  // Onboarding page
  onboard: {
    title: 'Join ABG Alumni Connect',
    subtitle: 'Create your profile to connect with fellow members',
    form: {
      fullName: 'Full Name',
      fullNamePlaceholder: 'John Doe',
      email: 'Email',
      emailPlaceholder: 'john@example.com',
      role: 'Current Role',
      rolePlaceholder: 'Product Manager',
      company: 'Company',
      companyPlaceholder: 'Acme Corp',
      expertise: 'Areas of Expertise',
      expertisePlaceholder: 'e.g., Product strategy, startup fundraising, SaaS metrics',
      canHelpWith: 'What can you help others with?',
      canHelpWithPlaceholder: 'e.g., Reviewing pitch decks, introductions to VCs, career advice',
      lookingFor: 'What are you looking for?',
      lookingForPlaceholder: 'e.g., Technical co-founders, enterprise sales connections, marketing advice',
      avatar: 'Click to upload photo (optional)',
      voice: 'Voice Introduction (optional)',
      voiceHelp: 'Upload a short voice intro to make your profile stand out.',
      abgClass: 'ABG Class',
      abgClassPlaceholder: 'e.g., ABG 22, ABG Alpha 2023',
      abgClassHelp: 'Enter your ABG class name (admin will verify)',
      nicknameSection: 'Nickname (Optional)',
      nickname: 'Nickname',
      nicknamePlaceholder: 'e.g., Johnny',
      nicknameHelp: 'A friendly name others can call you',
      displayNicknameWhere: 'Show nickname instead of full name:',
      displayInSearch: 'In search results',
      displayInMatch: 'In match suggestions',
      displayInEmail: 'In introduction emails',
      discordUsername: 'Discord Username',
      discordHelp: 'For community notifications',
      openToWork: 'Open to new opportunities',
      jobPreferences: 'What kind of job are you looking for?',
      jobPreferencesPlaceholder: 'e.g., Senior Developer, Hybrid, Salary >$5000...',
      hiring: 'I am hiring',
      hiringPreferences: 'What kind of candidate are you looking for?',
      hiringPreferencesPlaceholder: 'e.g., Marketing Manager, 3yr exp, fluent English...',
      sectionCareer: 'Career Opportunities (Optional)',
      gender: 'Gender',
      genderFemale: 'Female',
      genderMale: 'Male',
      genderUndisclosed: 'Prefer not to say',
      relationshipStatus: 'Relationship Status',
      relationshipSingle: 'Single',
      relationshipAvailable: 'Single (Available)',
      relationshipInRelationship: 'In a Relationship',
      relationshipMarried: 'Married',
      relationshipPreferNotToSay: 'Prefer not to say',
      submit: 'Complete Profile',
      submitting: 'Creating your profile...',
      continueWithGoogle: 'Continue with Google',
      emailGoogleNote: 'Your email will be automatically filled from your Google account',
    },
    success: {
      title: 'Welcome aboard!',
      checkEmail: 'Check your email for confirmation.',
      generatedBio: 'Your generated bio:',
      completePayment: 'Complete Payment',
    },
    validation: {
      nameRequired: 'Name required',
      emailRequired: 'Valid email required',
      roleRequired: 'Role required',
      companyRequired: 'Company required',
      expertiseMin: 'Describe your expertise (min 10 chars)',
      canHelpMin: 'What can you help with? (min 10 chars)',
      lookingForMin: 'What are you looking for? (min 10 chars)',
    },
  },

  // Request page
  request: {
    title: 'Find a Connection',
    subtitle: 'Describe what you need and we\'ll match you with the right people',
    form: {
      email: 'Your Email',
      emailPlaceholder: 'your@email.com',
      emailHelp: 'Must match your registered member email',
      requestText: 'What do you need help with?',
      requestTextPlaceholder: 'Be specific about what you\'re looking for. For example: \'I\'m launching a B2B SaaS product and need advice on enterprise sales strategies and introductions to potential customers in the manufacturing sector.\'',
      submit: 'Find Connections',
      submitting: 'Finding matches...',
    },
    validation: {
      emailRequired: 'Valid email required',
      requestMin: 'Please describe your need in detail (min 20 chars)',
      limitReached: 'Free request limit reached. Please complete membership payment to continue.',
    },
    errors: {
      limitReached: 'Free request limit reached. Please complete membership payment to continue.',
      rateLimitExceeded: 'You have made too many requests. Please try again later.',
      dailyLimitReached: 'Daily request limit reached. Premium members can make up to {limit} requests per day.',
      authRequired: 'Authentication required to make requests',
    },
  },

  // Authentication
  auth: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signInWith: 'Sign in with {provider}',
    signInRequired: 'Please sign in to continue',
    signInDescription: 'Sign in to find your perfect match',
    accountSuspended: 'Your account has been suspended for suspicious activity. Please contact support.',
    sessionExpired: 'Your session has expired. Please sign in again',
    signedIn: 'Signed in as {email}',
  },

  // Match results
  matches: {
    title: 'We found {count} potential match',
    titlePlural: 'We found {count} potential matches',
    selectPrompt: 'Select someone to connect with',
    whyMatched: 'Why we matched you:',
    requestIntro: 'Request Introduction',
    sendingIntro: 'Sending introduction...',
    footerNote: 'Both you and your match will receive an email introduction',
    success: {
      title: 'Introduction Sent!',
      message: 'We\'ve sent an email to both you and your match. Check your inbox!',
    },
  },

  // Error page
  errorPage: {
    title: 'Something went wrong',
    message: 'We encountered an unexpected error. Please try again.',
    retry: 'Try again',
  },

  // Email templates
  email: {
    onboarding: {
      subject: 'Welcome to ABG Alumni Connect!',
      greeting: 'Welcome, {name}!',
      bioIntro: 'Your profile has been created. Here\'s your generated bio:',
      canFind: 'Other members can now find and connect with you based on your expertise.',
      readyToConnect: 'Ready to find connections? Visit the app to submit a request.',
      regards: 'Best regards,',
      signature: 'ABG Alumni Connect',
    },
    intro: {
      subject: 'ABG Connect: {requesterName} would like to connect with you',
      greeting: 'Hi {targetName},',
      lookingFor: '{requesterName} ({requesterRole} at {requesterCompany}) is looking for:',
      whyMatched: 'Why we matched you:',
      replyPrompt: 'If you\'re open to connecting, simply reply to this email - both parties are included.',
      regards: 'Best regards,',
      signature: 'ABG Alumni Connect',
      footer: 'This introduction was requested through ABG Alumni Connect. Both {requesterName} and {targetName} received this email.',
    },
  },

  // My Requests page
  myRequests: {
    title: 'My Connection Requests',
    subtitle: 'View and track your connection requests',
    enterEmail: 'Enter your email to view requests',
    emailPlaceholder: 'your@email.com',
    viewRequests: 'View My Requests',
    loading: 'Loading your requests...',
    noRequests: 'No connection requests yet',
    noRequestsHelp: 'Submit a connection request to get started',
    requestOn: 'Requested on',
    status: {
      pending: 'Pending',
      matched: 'Matched',
      connected: 'Connected',
      declined: 'Declined',
    },
    matchedWith: 'Matched with',
    connectedWith: 'Connected with',
    potentialMatches: 'Potential matches',
    backToRequests: 'Back to requests',
  },

  // Language switcher
  language: {
    en: 'English',
    vi: 'Tiếng Việt',
  },

  // Payment
  payment: {
    title: 'Complete Your Membership',
    qrPlaceholder: 'QR Code',
    qrComingSoon: 'Scan code coming soon',
    bankDetails: 'Bank Transfer Details',
    bank: 'Bank',
    accountNumber: 'Account Number',
    accountName: 'Account Name',
    amount: 'Amount',
    reference: 'Reference',
    instructions: 'After transferring, click "I\'ve Made Payment". Admin will verify and activate your premium membership within 24 hours.',
    confirmPayment: 'I\'ve Made Payment',
    confirming: 'Confirming...',
    cancel: 'Cancel',
    confirmationTitle: 'Confirmation Sent!',
    confirmationMessage: 'Admin will verify payment and activate your Premium account within 24 hours.',
    findConnections: 'Find Connections Now',
  },

  // Dating
  dating: {
    professionalNetwork: 'Professional Network',
    findPartner: 'Find a Partner ❤️',
    idealMatch: 'Describe your ideal match ❤️',
    idealMatchPlaceholder: 'e.g., I\'m looking for someone who loves outdoor activities, values honesty, and enjoys deep conversations about life...',
    findMyMatch: 'Find My Match ❤️',
    searching: 'Finding your match...',
    findJob: 'Find a Job 💼',
    findCandidates: 'Recruit 🤝',
    jobPreferences: 'What kind of job are you looking for?',
    jobPreferencesPlaceholder: 'e.g., I am looking for a Product Manager role in a tech company...',
    hiringPreferences: 'What kind of candidate are you looking for?',
    hiringPreferencesPlaceholder: 'e.g., Looking for a Senior React Dev with 3 years of experience...',
    findJobBtn: 'Find Job',
    findCandidatesBtn: 'Find Candidates',
    // Profile completion
    completeProfile: 'Complete Your Profile',
    completeProfileDescription: 'To use the dating feature, please provide your gender and confirm your availability status.',
    selectGender: 'Select your gender',
    selectStatus: 'Select status',
    genderNote: 'Note: "Undisclosed" is not available for dating feature',
    statusNote: 'Only single members can use the dating feature',
    saveAndContinue: 'Save & Continue',
  },

  // Profile page
  profile: {
    title: 'My Profile',
    editProfile: 'Edit Profile',
    cancelEdit: 'Cancel',
    saveChanges: 'Save Changes',
    memberSince: 'Member since',
    sections: {
      about: 'About',
      expertise: 'Expertise & Skills',
      career: 'Career Opportunities',
      personal: 'Personal Information',
      social: 'Social Links',
      privacy: 'Privacy Settings',
      dating: 'Dating Profile',
    },
    membership: {
      premium: 'Premium',
      basic: 'Basic',
      pending: 'Pending',
      'grace-period': 'Grace Period',
      expired: 'Expired',
    },
    privacy: {
      displayNicknameInSearch: 'Display nickname instead of full name in search results',
      displayNicknameInMatch: 'Display nickname instead of full name in match results',
      displayNicknameInEmail: 'Display nickname instead of full name in email introductions',
    },
    datingDescription: 'Fill out this section to enhance your dating profile.',
    dating: {
      selfDescription: 'Describe yourself in 3 words',
      selfDescriptionPlaceholder: 'e.g., Creative, Adventurous, Thoughtful',
      truthLie: '2 Truths & 1 Lie',
      truthLiePlaceholder: 'Share 2 truths and 1 lie about yourself',
      idealDay: 'My Ideal Day',
      idealDayPlaceholder: 'Describe your perfect day...',
      qualitiesLookingFor: 'Qualities I Look For',
      qualitiesPlaceholder: 'What qualities are you looking for in a partner?',
      coreValues: 'My Core Values',
      coreValuesPlaceholder: 'What values matter most to you?',
      dealBreakers: 'Deal Breakers',
      dealBreakersPlaceholder: 'What are your relationship deal breakers?',
      interests: 'Hobbies & Interests',
      interestsPlaceholder: 'What do you enjoy doing?',
      message: 'Message to Potential Matches',
      messagePlaceholder: 'Write a message to someone who might be interested...',
      otherShare: 'Anything else to share?',
      otherSharePlaceholder: 'Any other details...',
    },
  },

  // News pages
  news: {
    pageTitle: 'Community News & Updates',
    pageSubtitle: 'Stay updated with the latest news, events, and opportunities from the ABG Alumni community.',
    // Category filter
    categories: {
      all: 'All News',
      edu: 'Edu',
      business: 'Business',
      event: 'Event',
      course: 'Course',
      announcement: 'Announcement',
    },
    // Info bar
    showingArticles: 'Showing {category} articles',
    itemCount: '{count} Items',
    // Card actions
    readFullStory: 'Read full story',
    loadMore: 'Load More Articles',
    noArticles: 'No articles found in this category.',
    // Article detail
    backToNews: 'Back to News',
    published: 'Published',
    by: 'By',
    shareArticle: 'Share this article',
    shareTwitter: 'Share on Twitter',
    shareLinkedIn: 'Share on LinkedIn',
    copyLink: 'Copy link',
    linkCopied: 'Link copied!',
    // Article navigation
    previousArticle: 'Previous Article',
    nextArticle: 'Next Article',
    // Author
    communityManagement: 'Community Management',
  },

  // History page
  history: {
    title: 'Connection History',
    myRequests: 'My Requests',
    incomingMatches: 'Incoming Matches',
    noRequests: 'No connection requests yet',
    noIncoming: 'No one has connected with you yet',
    theyWereLookingFor: 'They were looking for:',
    filterAll: 'All statuses',
    dateAll: 'All time',
    dateLast7: 'Last 7 days',
    dateLast30: 'Last 30 days',
    status: {
      pending: 'Pending',
      matched: 'Matched',
      connected: 'Connected',
      declined: 'Declined',
    },
  },
} as const;

// Deep type that converts literal strings to string type
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Translations = DeepStringify<typeof en>;
