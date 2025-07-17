export const DEFAULT_PROFILES = [
    { 
        id: 'léna', 
        displayName: "Léna", 
        mainTranslation: "蕾娜", 
        image: `https://placehold.co/64x64/f8b4b4/333?text=L`,
        // New fields
        birthdate: '2015-06-29', // YYYY-MM-DD
        timezone: 'Asia/Shanghai',
        nicknames: [ 
            { id: Date.now()+1, display: "Star", baseLang_value: "my star", targetLang_value: "我的小星星" }
        ]
    },
    { 
        id: 'leelou', 
        displayName: "Leelou", 
        mainTranslation: "理露", 
        image: `https://placehold.co/64x64/b4d2f8/333?text=S`,
        // New fields
        birthdate: '2013-09-11', // YYYY-MM-DD
        timezone: 'Asia/Shanghai',
        nicknames: []
    }
];

export const DEFAULT_CATEGORIES = [
    { 
        id: 'greetings',
        title: "Greetings",
        order: 0,
        phrases: [
            { id: 'greet1', baseLang: "Good morning {name}, how are you today?", targetLang: "早上好 {name}，你今天过得怎么样？" },
            { id: 'greet2', baseLang: "Good night {name}, sweet dreams.", targetLang: "晚安 {name}，做个好梦。" },
            { id: 'greet3', baseLang: "Have a wonderful day, {name}!", targetLang: "祝你今天过得愉快，{name}！" },
        ]
    },
    { 
        id: 'questions',
        title: "Questions",
        order: 1,
        phrases: [
            { id: 'quest1', baseLang: "Did you eat well, {name}?", targetLang: "{name}，你吃得好吗？" },
            { id: 'quest2', baseLang: "When are you coming home, {name}?", targetLang: "你什么时候回家，{name}？" },
            { id: 'quest3', baseLang: "How was your day, {name}?", targetLang: "{name}，你今天过得怎么样？" },
            { id: 'quest4', baseLang: "Are you feeling okay, {name}?", targetLang: "{name}，你感觉还好吗？" },
        ]
    },
    { 
        id: 'affection',
        title: "Affection",
        order: 2,
        phrases: [
            { id: 'aff1', baseLang: "I'm thinking of you, {name}.", targetLang: "我在想你，{name}。" },
            { id: 'aff2', baseLang: "I love you, {name}.", targetLang: "我爱你，{name}。" },
            { id: 'aff3', baseLang: "I miss you so much, {name}.", targetLang: "我很想你，{name}。" },
            { id: 'aff4', baseLang: "You make me so proud, {name}.", targetLang: "你让我很骄傲，{name}。" },
        ]
    },
    { 
        id: 'school',
        title: "School",
        order: 3,
        phrases: [
            { id: 'school1', baseLang: "Did you finish your homework, {name}?", targetLang: "{name}，你做完作业了吗？" },
            { id: 'school2', baseLang: "Good luck with your test today, {name}!", targetLang: "{name}，祝你今天考试顺利！" },
            { id: 'school3', baseLang: "How was school today, {name}?", targetLang: "{name}，今天上学怎么样？" },
            { id: 'school4', baseLang: "Don't forget to pack your backpack, {name}.", targetLang: "{name}，别忘了收拾书包。" },
            { id: 'school5', baseLang: "Study hard, {name}. I believe in you!", targetLang: "好好学习，{name}。我相信你！" },
        ]
    },
    { 
        id: 'sports',
        title: "Sports",
        order: 4,
        phrases: [
            { id: 'sport1', baseLang: "Good luck at practice today, {name}!", targetLang: "{name}，祝你今天训练顺利！" },
            { id: 'sport2', baseLang: "How was your game, {name}?", targetLang: "{name}，你的比赛怎么样？" },
            { id: 'sport3', baseLang: "You played amazingly, {name}!", targetLang: "{name}，你表现得太棒了！" },
            { id: 'sport4', baseLang: "Don't forget your sports gear, {name}.", targetLang: "{name}，别忘了带运动装备。" },
            { id: 'sport5', baseLang: "Keep up the great work, {name}!", targetLang: "继续保持，{name}！" },
        ]
    },
    { 
        id: 'holidays',
        title: "Holidays",
        order: 5,
        phrases: [
            { id: 'holiday1', baseLang: "Enjoy your vacation, {name}!", targetLang: "{name}，享受你的假期！" },
            { id: 'holiday2', baseLang: "Are you having fun on your trip, {name}?", targetLang: "{name}，你旅行玩得开心吗？" },
            { id: 'holiday3', baseLang: "Take lots of photos, {name}!", targetLang: "{name}，多拍点照片！" },
            { id: 'holiday4', baseLang: "Rest well during the holidays, {name}.", targetLang: "{name}，假期要好好休息。" },
            { id: 'holiday5', baseLang: "Happy holidays, {name}!", targetLang: "{name}，节日快乐！" },
        ]
    },
    { 
        id: 'birthday',
        title: "Birthday",
        order: 6,
        phrases: [
            { id: 'birthday1', baseLang: "Happy birthday, {name}! Hope all your wishes come true!", targetLang: "生日快乐，{name}！希望你所有的愿望都能实现！" },
            { id: 'birthday2', baseLang: "Wishing you the happiest birthday, {name}!", targetLang: "祝你生日最快乐，{name}！" },
            { id: 'birthday3', baseLang: "Another year older and wiser, {name}!", targetLang: "又长大了一岁，{name}！" },
            { id: 'birthday4', baseLang: "Can't wait to celebrate with you, {name}!", targetLang: "迫不及待要和你一起庆祝，{name}！" },
            { id: 'birthday5', baseLang: "You're growing up so fast, {name}!", targetLang: "{name}，你长得太快了！" },
        ]
    },
    { 
        id: 'christmas',
        title: "Christmas",
        order: 7,
        phrases: [
            { id: 'christmas1', baseLang: "Merry Christmas, {name}!", targetLang: "圣诞快乐，{name}！" },
            { id: 'christmas2', baseLang: "Santa is coming soon, {name}!", targetLang: "{name}，圣诞老人就要来了！" },
            { id: 'christmas3', baseLang: "Have you been good this year, {name}?", targetLang: "{name}，你今年表现好吗？" },
            { id: 'christmas4', baseLang: "Can't wait to open presents with you, {name}!", targetLang: "迫不及待要和你一起拆礼物，{name}！" },
            { id: 'christmas5', baseLang: "The Christmas tree looks beautiful, {name}.", targetLang: "{name}，圣诞树真漂亮。" },
        ]
    },
    { 
        id: 'special-events',
        title: "Special Events",
        order: 8,
        phrases: [
            { id: 'special1', baseLang: "Happy New Year, {name}! This will be an amazing year!", targetLang: "新年快乐，{name}！这将是美好的一年！" },
            { id: 'special2', baseLang: "Congratulations on your achievement, {name}!", targetLang: "恭喜你取得成就，{name}！" },
            { id: 'special3', baseLang: "Today is a special day, {name}!", targetLang: "今天是特别的日子，{name}！" },
            { id: 'special4', baseLang: "You did something amazing today, {name}!", targetLang: "{name}，你今天做了了不起的事！" },
            { id: 'special5', baseLang: "Let's celebrate together, {name}!", targetLang: "我们一起庆祝吧，{name}！" },
            { id: 'special6', baseLang: "This moment is so precious, {name}.", targetLang: "这个时刻很珍贵，{name}。" },
        ]
    }
];