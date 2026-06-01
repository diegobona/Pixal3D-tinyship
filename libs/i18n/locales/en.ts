import type { Locale } from './types'

export const en: Locale = {
  common: {
    login: "Login",
    and: "and",
    loading: "Loading...",
    unexpectedError: "An unexpected error occurred",
    viewPlans: "View Plans"
  },
  actions: {
    previous: "Previous",
    next: "Next",
    createAccount: "Create account"
  },
  home: {
    metadata: {
      title: "Pixal3D - AI Image to 3D Model Generator",
      description: "Turn images into faithful GLB 3D models with Pixal3D. Start free, preview models online, and download production-ready 3D assets.",
      keywords: "pixal3d, image to 3d, ai 3d model generator, 3d model maker, image to glb, ai 3d assets"
    }
  },
  header: {
    navigation: {
      home: "Home",
      pricing: "Pricing",
      blog: "Blog"
    },
    auth: {
      signIn: "Sign In",
      signOut: "Sign Out",
      dashboard: "Dashboard",
      myAssets: "My Assets",
      myCredits: "My Credits"
    },
    language: {
      english: "English",
      chinese: "中文"
    }
  },
  pixal3d: {
    generator: {
      heroTitle: "Turn Any Image into a Faithful 3D Model",
      subtitle: "Free to try, no sign-in needed",
      imageHint: "Single image input for the Pixal3D generation pipeline.",
      imagePreviewAlt: "Uploaded reference image",
      uploadButton: "Upload image",
      dragDropPaste: "Drag & drop",
      orLabel: "OR",
      selectFileButton: "Select file",
      samplePrompt: "No image? Try these:",
      useSample: "Use sample",
      removeImage: "Remove uploaded image",
      featuresNav: "Features",
      defaultPrompt: "Create a clean, game-ready 3D asset with accurate proportions, tidy topology, neutral studio lighting, and PBR-friendly materials.",
      trialDescription: "Users without a subscription get two Free Trial sessions. Each session lasts 15 minutes. (No credits required)",
      stylePreset: "Game Dev: High Poly",
      cleanTopology: "Clean topology",
      pbrMaterials: "PBR materials",
      upgradeButton: "Upgrade",
      freeTrialButton: "Free Trial",
      freeTrialLoading: "Finding server...",
      freeTrialSelected: "Free trial server is ready.",
      freeTrialExpired: "Free trial session ended.",
      hfTrialTitle: "Pixal3D Free Trial",
      hfTrialQueueLabel: "Current queue",
      hfTrialTimeLeft: "Time left",
      hfTrialStartHint: "If the \"Start Generation\" button is disabled, please wait a few seconds while the server finishes loading.",
      hfTrialClose: "Close",
      hfTrialFindingTitle: "Finding an available server",
      hfTrialFindingDescription: "We are checking the free trial pool and reserving a live Pixal3D session for you. This usually takes a few seconds.",
      hfTrialLoadingTitle: "Loading your free trial workspace",
      hfTrialLoadingDescription: "The server is ready. The workspace is opening now, so keep this tab open for a moment.",
      generateButton: "Generate Model",
      generatingButton: "Building model...",
      resultTitle: "3D model is ready",
      previewTitle: "Preview 3D Model",
      previewLoading: "Loading model...",
      previewErrorTitle: "Model preview failed",
      previewErrorDescription: "The preview could not load this GLB. You can still download the file and open it in another 3D viewer.",
      previewModelButton: "Preview GLB",
      closePreviewButton: "Close preview",
      openModelButton: "Open GLB",
      downloadModelButton: "Download GLB",
      settings: {
        resolution: "Target Resolution",
        textureSize: "Texture Size",
        advanceSettings: "Advanced Settings",
        showAdvanceSettings: "Expand settings",
        hideAdvanceSettings: "Collapse settings",
        advancedSettingsSummary: "15 controls",
        on: "On",
        off: "Off",
        fields: {
          decimationTarget: "Decimation Target",
          maxNumTokens: "Max Num Tokens",
          meshScale: "Mesh Scale",
          sparseStructureGuidanceStrength: "SS Guidance Strength",
          sparseStructureGuidanceRescale: "SS Guidance Rescale",
          sparseStructureSteps: "SS Sampling Steps",
          sparseStructureRescaleT: "SS Rescale T",
          shapeGuidanceStrength: "Shape Guidance Strength",
          shapeGuidanceRescale: "Shape Guidance Rescale",
          shapeSteps: "Shape Sampling Steps",
          shapeRescaleT: "Shape Rescale T",
          textureGuidanceStrength: "Texture Guidance Strength",
          textureSteps: "Texture Sampling Steps",
          textureRescaleT: "Texture Rescale T",
          remesh: "Remesh"
        }
      },
      status: {
        idle: "Upload an image to start.",
        ready: "Image ready. Generate your model.",
        creating: "Creating 3D task...",
        processing: "Building the GLB...",
        stillChecking: "Still checking in My Assets...",
        succeeded: "3D model is ready."
      },
      progress: {
        title: "Generation progress",
        completedTitle: "3D model is ready",
        checkingTitle: "Still checking the result",
        failedTitle: "Generation stopped",
        steps: {
          submitting: "Submitting request",
          waitingForRunner: "Waiting for runner",
          preparingImage: "Preparing image",
          samplingSparseStructure: "Sampling sparse structure",
          samplingShapeSLat: "Sampling shape SLat",
          samplingTextureSLat: "Sampling texture SLat",
          buildingMesh: "Building mesh and GLB",
          finalizingPreview: "Finalizing preview"
        }
      },
      errors: {
        unsupportedImage: "Please upload a JPG, PNG, WebP, or BMP image.",
        imageTooLarge: "Image must be 10 MB or smaller.",
        uploadFailed: "Could not read the image. Please try another file.",
        imageRequired: "Upload a reference image first.",
        signInRequired: "Sign in or upgrade to generate and save models.",
        generationFailed: "3D generation failed.",
        statusFailed: "Could not check the 3D task status.",
        timeout: "3D generation timed out. Please try again.",
        statusStillChecking: "Your model is still being checked.",
        statusStillCheckingDescription: "The task was submitted, but this page could not confirm the final result yet. Check My Assets in a few minutes.",
        timeoutStillChecking: "The task is taking longer than expected. It may still finish in My Assets.",
        freeTrialBusy: "Free trial server is busy, try again later",
        freeTrialLimitReached: "Free trials used.Sign in to generate with credits.",
        trialUsed: "Free trial already used",
        trialUsedDescription: "Create an account to continue generating Pixal3D models.",
        generateDisabledSignIn: "Sign in to generate with credits",
        generateDisabledInsufficientCredits: "Not enough credits.",
        generateDisabledImageRequired: "Upload an image first",
        generateDisabledReadingImage: "Reading image...",
        insufficientCredits: "Not enough credits for 3D generation.",
        insufficientCreditsDescription: "This resolution requires {required} credits. Your current balance is {balance} credits."
      }
    },
    advantages: {
      eyebrow: "Pixal3D Advantages",
      title: "Why choose Pixal3D",
      items: {
        faithful: {
          title: "Faithful to your image",
          description: "Generate 3D models that stay closer to the original shape, style, and visual identity of your input image."
        },
        pixelAligned: {
          title: "Pixel-aligned 3D generation",
          description: "Build a stronger connection between 2D image pixels and 3D space for clearer image-to-3D results."
        },
        geometry: {
          title: "Detailed geometry reconstruction",
          description: "Capture object contours, structures, and shape details instead of settling for an overly simplified 3D model."
        },
        pbr: {
          title: "PBR texture generation",
          description: "Create 3D models with richer physically based textures for more realistic GLB previews and 3D asset projects."
        },
        fast: {
          title: "Fast model generation",
          description: "Complete model generation quickly for image-to-3D model and GLB preparation tests."
        }
      }
    },
    inspiration: {
      eyebrow: "Model Inspiration Gallery",
      title: "Explore example 3D model directions for your next generation",
      generateSimilar: "Click to generate a similar 3D model"
    },
    faq: {
      title: "FAQ",
      items: {
        generator: {
          question: "Is Pixal3D an AI 3D model generator?",
          answer: "Pixal3D.net is an online image to 3D model generator for creating faithful 3D models from reference images and exporting GLB outputs."
        },
        oneImage: {
          question: "Can Pixal3D create a 3D model from one image?",
          answer: "Yes. Start with a clear reference image, then use the generator to create a 3D model that can be reviewed and used in downstream projects."
        },
        bestImages: {
          question: "What images work best for image-to-3D generation?",
          answer: "Single-object images with a clean background, strong silhouette, and visible shape details usually work better than crowded scenes or heavily occluded subjects."
        },
        formats: {
          question: "Can I use the result as a GLB file?",
          answer: "Pixal3D.net is designed around GLB output. Always inspect the generated mesh before using it in production or interactive scenes."
        }
      }
    }
  },
  auth: {
    metadata: {
      signin: {
        title: "Pixal3D - Sign In",
        description: "Sign in to Pixal3D to generate and manage AI 3D models.",
        keywords: "Pixal3D login, sign in, AI 3D model account"
      },
      signup: {
        title: "Pixal3D - Sign Up",
        description: "Create a Pixal3D account to save AI 3D model history and use credits.",
        keywords: "Pixal3D sign up, create account, AI 3D model account"
      }
    },
    signin: {
      welcomeBack: "Welcome back",
      description: "Sign in with Google or email",
      socialLogin: "Sign in with Google",
      orContinueWith: "Or continue with email",
      email: "Email",
      emailPlaceholder: "Enter your email",
      password: "Password",
      rememberMe: "Remember me",
      submit: "Sign in",
      submitting: "Signing in...",
      success: "Signed in",
      noAccount: "Don't have an account?",
      signupLink: "Sign up",
      termsNotice: "By clicking continue, you agree to our",
      termsOfService: "Terms of Service",
      privacyPolicy: "Privacy Policy",
      errors: {
        required: "Email and password are required.",
        invalidCredentials: "Invalid email or password."
      },
      socialProviders: {
        google: "Google"
      }
    },
    signup: {
      title: "Create your account",
      description: "Use email and password to create a Pixal3D account.",
      name: "Name",
      namePlaceholder: "Enter your name",
      email: "Email",
      emailPlaceholder: "Enter your email",
      password: "Password",
      passwordPlaceholder: "At least 8 characters",
      submit: "Create account",
      submitting: "Creating account...",
      success: "Account created",
      haveAccount: "Already have an account?",
      signinLink: "Sign in",
      errors: {
        required: "Name, email, and password are required.",
        passwordTooShort: "Password must be at least 8 characters."
      }
    }
  },
  pricing: {
    metadata: {
      title: "Pixal3D Pricing - Credits for AI 3D Models",
      description: "Choose Pixal3D credits for image-to-3D generation, GLB downloads, queue priority, and private asset ownership.",
      keywords: "pixal3d pricing, ai 3d model credits, image to 3d subscription"
    },
    freeTrialNotice: "Two Free Trial sessions (Each session lasts 15 minutes, no credits required)",
    billedYearly: "Billed yearly: ${amount}"
  },
  payment: {
    metadata: {
      success: {
        title: "Payment Successful - Pixal3D",
        description: "Your Pixal3D payment was processed successfully.",
        keywords: "payment successful, Pixal3D subscription"
      },
      cancel: {
        title: "Payment Canceled - Pixal3D",
        description: "Your Pixal3D payment was canceled.",
        keywords: "payment canceled, Pixal3D checkout"
      }
    },
    result: {
      success: {
        title: "Payment Successful",
        description: "Your payment has been processed successfully.",
        actions: {
          viewDashboard: "View Dashboard",
          backToHome: "Back to Home"
        }
      },
      cancel: {
        title: "Payment Canceled",
        description: "Your payment was canceled. You can return to pricing and try again.",
        actions: {
          tryAgain: "Try Again",
          contactSupport: "Contact Support",
          backToHome: "Back to Home"
        }
      }
    }
  },
  blog: {
    metadata: {
      title: "Pixal3D Blog",
      description: "Read Pixal3D updates and guides for AI 3D model generation.",
      keywords: "Pixal3D blog, AI 3D model guide, image to 3D"
    },
    title: "Blog",
    subtitle: "Pixal3D updates and guides",
    publishedOn: "Published on",
    by: "by",
    noPosts: "No posts yet. Check back soon!",
    backToBlog: "Back to Blog"
  },
  dashboard: {
    metadata: {
      title: "Pixal3D Dashboard",
      description: "View your Pixal3D subscription, credits, and account details.",
      keywords: "Pixal3D dashboard, subscription, credits"
    },
    eyebrow: "Account",
    title: "Dashboard",
    description: "View your plan, subscription period, credits, and recent payments.",
    actions: {
      managePlan: "Manage Plan"
    },
    subscription: {
      label: "Current plan",
      active: "Active",
      free: "Free",
      canceled: "Canceled",
      expired: "Expired",
      cancelAtPeriodEnd: "Cancels at period end",
      billingCycle: "Billing cycle",
      periodStart: "Started",
      validUntil: "Valid until",
      lifetime: "Lifetime",
      included: "Included limits"
    },
    credits: {
      label: "Credits",
      description: "Available credits for Pixal3D model generation.",
      pricingHint: "Per-generation credit usage will decrease as provider pricing drops."
    },
    account: {
      label: "Account",
      unnamed: "Unnamed user",
      memberSince: "Member since"
    },
    orders: {
      label: "Payments",
      title: "Recent orders",
      empty: "No payments yet."
    }
  },
  myAssets: {
    eyebrow: "Your Library",
    title: "My Assets",
    description: "Review your recent Pixal3D generation tasks and reopen completed GLB models.",
    actions: {
      create: "Create",
      refresh: "Refresh",
      preview3DModel: "Preview 3D Model",
      openModel: "Open GLB",
      sourceImage: "Source Image",
      previous: "Previous",
      next: "Next"
    },
    empty: {
      title: "No generation history yet",
      description: "Create your first 3D model and it will appear here."
    },
    card: {
      targetResolution: "Target Resolution",
      textureSize: "Texture Size",
      createdAt: "Created",
      credits: "Credits",
      checkingStatus: "Checking status...",
      status: {
        processing: "Processing",
        succeeded: "Completed",
        failed: "Failed"
      }
    }
  }
} as const;
