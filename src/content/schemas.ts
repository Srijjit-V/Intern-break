import { z } from 'zod';
export const schemas = {
  games: z.object({
    "GAMES": z.array(z.object({
      "id": z.string(),
      "title": z.string(),
      "description": z.string(),
      "emoji": z.string(),
      "color": z.string(),
      "glow": z.string(),
      "path": z.string().optional(),
      "live": z.boolean(),
      "tag": z.string(),
      "image": z.string().optional()
    }))
  }),
  leaderboard: z.object({
    "tabList": z.array(z.object({
      "key": z.string(),
      "label": z.string(),
      "id": z.string()
    }))
  }),
  freezeria: z.object({
    "title": z.string(),
    "subtitle": z.string(),
    "backLabel": z.string(),
    "stationLabels": z.object({
      "order": z.string(),
      "blend": z.string(),
      "build": z.string(),
      "serve": z.string()
    }),
    "instructions": z.object({
      "title": z.string(),
      "items": z.array(z.string()),
      "steps": z.array(z.object({
        "title": z.string(),
        "body": z.string(),
        "icon": z.string().optional()
      })).optional()
    }),
    "buttons": z.object({
      "start": z.string(),
      "next": z.string(),
      "serve": z.string(),
      "restart": z.string()
    }),
    "status": z.object({
      "day": z.string(),
      "score": z.string(),
      "streak": z.string(),
      "patience": z.string(),
      "perfect": z.string(),
      "good": z.string(),
      "miss": z.string()
    })
  }),
  snake: z.object({
    "title": z.string(),
    "description": z.string(),
    "instructions": z.string(),
    "pointsLabel": z.string(),
    "startButton": z.string(),
    "playAgainButton": z.string(),
    "topScoresTitle": z.string(),
    "noScoresText": z.string()
  }),
  memory: z.object({
    "title": z.string(),
    "description": z.string(),
    "previewBanner": z.string(),
    "startButton": z.string(),
    "playAgainButton": z.string(),
    "changeDiffButton": z.string(),
    "topScoresTitle": z.string(),
    "noScoresText": z.string(),
    "scoreFormula": z.string(),
    "howToPlayTitle": z.string(),
    "howToPlay": z.array(z.string()),
    "difficulties": z.array(z.object({
      "id": z.string(),
      "label": z.string(),
      "detail": z.string()
    }))
  }),
  trivia: z.array(z.object({
    "id": z.string(),
    "question": z.string(),
    "answers": z.array(z.string()),
    "correct": z.number(),
    "category": z.string(),
    "difficulty": z.string()
  })),
  profile: z.object({
    "AVATAR_COLORS": z.array(z.string()),
    "AVATAR_QUICK_PICKS": z.array(z.string()),
    "AVATAR_EMOJIS": z.array(z.string())
  }),
  set: z.object({
    "title": z.string(),
    "subtitle": z.string(),
    "backLabel": z.string(),
    "howToPlay": z.object({
      "heading": z.string(),
      "rules": z.array(z.object({
        "id": z.string(),
        "emoji": z.string(),
        "attr": z.string(),
        "desc": z.string()
      }))
    }),
    "buttons": z.object({
      "start": z.string(),
      "playAgain": z.string(),
      "done": z.string(),
      "hint": z.string(),
      "hintUsed": z.string(),
      "quit": z.string()
    }),
    "status": z.object({
      "sets": z.string(),
      "mistakes": z.string(),
      "setsOnBoard": z.string(),
      "setOnBoard": z.string(),
      "noMoreSets": z.string(),
      "gameOver": z.string(),
      "newBest": z.string(),
      "personalBest": z.string()
    }),
    "score": z.object({
      "setsFound": z.string(),
      "mistakesLabel": z.string(),
      "timeBonus": z.string(),
      "total": z.string()
    })
  }),
  rewards: z.object({
    "hero": z.object({
      "eyebrow": z.string(),
      "title": z.string(),
      "description": z.string()
    }),
    "labels": z.object({
      "balance": z.string(),
      "redeem": z.string(),
      "history": z.string(),
      "emptyHistory": z.string(),
      "success": z.string(),
      "insufficient": z.string()
    }),
    "rewards": z.array(z.object({
      "name": z.string(),
      "description": z.string(),
      "points": z.string(),
      "icon": z.string(),
      "id": z.string(),
      "image": z.string().optional()
    }))
  }),
  typing_race: z.object({
    "eyebrow": z.string(),
    "title": z.string(),
    "description": z.string(),
    "backToGames": z.string(),
    "racersLabel": z.string(),
    "nitroLabel": z.string(),
    "chooseCar": z.string(),
    "startRace": z.string(),
    "restartRace": z.string(),
    "inputPlaceholder": z.string(),
    "idlePlaceholder": z.string(),
    "finishMessage": z.string(),
    "modes": z.object({
      "single": z.string(),
      "multi": z.string()
    })
  }),
  points_history: z.object({
    "meta": z.object({
      "title": z.string(),
      "description": z.string()
    }),
    "hero": z.object({
      "eyebrow": z.string(),
      "title": z.string(),
      "description": z.string()
    }),
    "live": z.object({
      "title": z.string(),
      "available": z.string(),
      "latest": z.string()
    }),
    "history": z.object({
      "title": z.string(),
      "empty": z.string(),
      "headers": z.object({
        "member": z.string(),
        "earned": z.string(),
        "carryover": z.string(),
        "closing": z.string()
      })
    })
  }),
  pages: {
    challenges: z.object({
      "pageTitle": z.string(),
      "pageKicker": z.string(),
      "pageSubtitle": z.string(),
      "weeklyRecapTitle": z.string(),
      "weeklyRecapSubtitle": z.string(),
      "refreshLabel": z.string(),
      "pointsTodayLabel": z.string(),
      "personalQuest": z.object({
        "eyebrow": z.string(),
        "markComplete": z.string(),
        "completedLabel": z.string()
      }),
      "companyQuest": z.object({
        "eyebrow": z.string(),
        "noQuestToday": z.string(),
        "setInAdmin": z.string(),
        "doneSuffix": z.string(),
        "markComplete": z.string(),
        "doneLabel": z.string(),
        "ptsSuffix": z.string()
      }),
      "moveBreak": z.object({
        "eyebrow": z.string(),
        "title": z.string(),
        "altHeading": z.string(),
        "whyTitle": z.string(),
        "whyBody": z.string(),
        "teamTodayLabel": z.string(),
        "moveBreaksSuffix": z.string(),
        "doneLabel": z.string(),
        "iDidIt": z.string(),
        "minutesSuffix": z.string(),
        "withPrefix": z.string()
      }),
      "groupQuests": z.object({
        "heading": z.string(),
        "cancelLabel": z.string(),
        "assignQuestLabel": z.string(),
        "createGroupHeading": z.string(),
        "createGroupDescription": z.string(),
        "groupNamePlaceholder": z.string(),
        "chooseTeammatesLabel": z.string(),
        "chooseTeammatesOptional": z.string(),
        "chooseTeammatesHint": z.string(),
        "noTeammatesYet": z.string(),
        "createGroupButton": z.string(),
        "groupNameError": z.string(),
        "groupExistsError": z.string(),
        "removeLabel": z.string(),
        "membersSuffix": z.string(),
        "byPrefix": z.string(),
        "notInGroup": z.string(),
        "assigningLabel": z.string(),
        "assignQuestButton": z.string(),
        "questPlaceholder": z.string(),
        "pointsLabel": z.string(),
        "postQuestButton": z.string(),
        "ptsSuffix": z.string(),
        "noQuestsEmpty": z.string(),
        "notInQuestGroup": z.string(),
        "doneLabel": z.string(),
        "tipText": z.string(),
        "assignGroupLabel": z.string()
      })
    }),
    auth: z.object({
      "login": z.object({
        "title": z.string(),
        "subtitle": z.string(),
        "emailLabel": z.string(),
        "passwordLabel": z.string(),
        "emailPlaceholder": z.string(),
        "passwordPlaceholder": z.string(),
        "submit": z.string(),
        "loading": z.string(),
        "noAccount": z.string(),
        "createAccount": z.string(),
        "invalidCredentials": z.string(),
        "genericError": z.string(),
        "aboutButton": z.string(),
        "aboutTitle": z.string(),
        "aboutIntro": z.string(),
        "aboutPoints": z.array(z.object({
          "title": z.string(),
          "description": z.string(),
          "id": z.string()
        })),
        "aboutClose": z.string()
      }),
      "signup": z.object({
        "title": z.string(),
        "subtitle": z.string(),
        "nameLabel": z.string(),
        "namePlaceholder": z.string(),
        "emailLabel": z.string(),
        "emailPlaceholder": z.string(),
        "passwordLabel": z.string(),
        "passwordPlaceholder": z.string(),
        "passwordHint": z.string(),
        "submit": z.string(),
        "loading": z.string(),
        "hasAccount": z.string(),
        "signIn": z.string(),
        "genericError": z.string(),
        "passwordLength": z.string(),
        "passwordUppercase": z.string(),
        "passwordNumber": z.string(),
        "passwordSpecial": z.string()
      })
    }),
    avatar_shop: z.object({
      "cosmetics": z.string(),
      "heading": z.string(),
      "subtitle": z.string(),
      "goldLabel": z.string(),
      "goldHint": z.string(),
      "previewLabel": z.string(),
      "rewardsLink": z.string(),
      "equippedLabel": z.string(),
      "ownedLabel": z.string(),
      "freeLabel": z.string(),
      "TABS": z.array(z.object({
        "slot": z.string(),
        "label": z.string(),
        "id": z.string()
      }))
    }),
    points_history: z.object({
      "meta": z.object({
        "title": z.string(),
        "description": z.string()
      }),
      "hero": z.object({
        "title": z.string(),
        "description": z.string()
      }),
      "live": z.object({
        "title": z.string(),
        "available": z.string(),
        "latest": z.string()
      }),
      "history": z.object({
        "title": z.string(),
        "empty": z.string(),
        "headers": z.object({
          "member": z.string(),
          "earned": z.string(),
          "carryover": z.string(),
          "closing": z.string()
        })
      })
    }),
    leaderboard: z.object({
      "tabList": z.array(z.object({
        "key": z.string(),
        "label": z.string(),
        "id": z.string()
      })),
      "hero": z.object({
        "eyebrow": z.string(),
        "title": z.string(),
        "subtitle": z.string()
      }),
      "stats": z.object({
        "membersLabel": z.string(),
        "totalPtsLabel": z.string(),
        "topFlappyLabel": z.string(),
        "activeTodayLabel": z.string()
      }),
      "podium": z.object({
        "championLabel": z.string(),
        "youLabel": z.string()
      }),
      "empty": z.object({
        "noMembers": z.string(),
        "noFlappy": z.string(),
        "flappyHint": z.string()
      }),
      "loading": z.string()
    })
  }
};
export type Schemas = typeof schemas;