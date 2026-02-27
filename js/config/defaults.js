export const DEFAULT_PROFILES = [
    { 
        id: 'léna', 
        originalName: "Léna", 
        mainTranslation: "蕾娜", 
        image: `https://placehold.co/64x64/f8b4b4/333?text=L`,
        // New fields
        birthdate: '2015-06-29', // YYYY-MM-DD
        timezone: 'Asia/Shanghai',
        nicknames: [ 
            { id: Date.now()+1, display: "Star", parentLang_value: "my star", kidLang_value: "我的小星星" }
        ]
    },
    { 
        id: 'leelou', 
        originalName: "Leelou", 
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
            { id: 'greet1', parentLang: "Good morning {name}, how are you today?", kidLang: "早上好 {name}，你今天过得怎么样？" },
            { id: 'greet2', parentLang: "Good night {name}, sweet dreams.", kidLang: "晚安 {name}，做个好梦。" },
            { id: 'greet3', parentLang: "Have a wonderful day, {name}!", kidLang: "祝你今天过得愉快，{name}！" },
        ]
    },
    { 
        id: 'questions',
        title: "Questions",
        order: 1,
        phrases: [
            { id: 'quest1', parentLang: "Did you eat well, {name}?", kidLang: "{name}，你吃得好吗？" },
            { id: 'quest2', parentLang: "When are you coming home, {name}?", kidLang: "你什么时候回家，{name}？" },
            { id: 'quest3', parentLang: "How was your day, {name}?", kidLang: "{name}，你今天过得怎么样？" },
            { id: 'quest4', parentLang: "Are you feeling okay, {name}?", kidLang: "{name}，你感觉还好吗？" },
        ]
    },
    { 
        id: 'affection',
        title: "Affection",
        order: 2,
        phrases: [
            { id: 'aff1', parentLang: "I'm thinking of you, {name}.", kidLang: "我在想你，{name}。" },
            { id: 'aff2', parentLang: "I love you, {name}.", kidLang: "我爱你，{name}。" },
            { id: 'aff3', parentLang: "I miss you so much, {name}.", kidLang: "我很想你，{name}。" },
            { id: 'aff4', parentLang: "You make me so proud, {name}.", kidLang: "你让我很骄傲，{name}。" },
        ]
    },
    { 
        id: 'school',
        title: "School",
        order: 3,
        phrases: [
            { id: 'school1', parentLang: "Did you finish your homework, {name}?", kidLang: "{name}，你做完作业了吗？" },
            { id: 'school2', parentLang: "Good luck with your test today, {name}!", kidLang: "{name}，祝你今天考试顺利！" },
            { id: 'school3', parentLang: "How was school today, {name}?", kidLang: "{name}，今天上学怎么样？" },
            { id: 'school4', parentLang: "Don't forget to pack your backpack, {name}.", kidLang: "{name}，别忘了收拾书包。" },
            { id: 'school5', parentLang: "Study hard, {name}. I believe in you!", kidLang: "好好学习，{name}。我相信你！" },
        ]
    },
    { 
        id: 'sports',
        title: "Sports",
        order: 4,
        phrases: [
            { id: 'sport1', parentLang: "Good luck at practice today, {name}!", kidLang: "{name}，祝你今天训练顺利！" },
            { id: 'sport2', parentLang: "How was your game, {name}?", kidLang: "{name}，你的比赛怎么样？" },
            { id: 'sport3', parentLang: "You played amazingly, {name}!", kidLang: "{name}，你表现得太棒了！" },
            { id: 'sport4', parentLang: "Don't forget your sports gear, {name}.", kidLang: "{name}，别忘了带运动装备。" },
            { id: 'sport5', parentLang: "Keep up the great work, {name}!", kidLang: "继续保持，{name}！" },
        ]
    },
    { 
        id: 'holidays',
        title: "Holidays",
        order: 5,
        phrases: [
            { id: 'holiday1', parentLang: "Enjoy your vacation, {name}!", kidLang: "{name}，享受你的假期！" },
            { id: 'holiday2', parentLang: "Are you having fun on your trip, {name}?", kidLang: "{name}，你旅行玩得开心吗？" },
            { id: 'holiday3', parentLang: "Take lots of photos, {name}!", kidLang: "{name}，多拍点照片！" },
            { id: 'holiday4', parentLang: "Rest well during the holidays, {name}.", kidLang: "{name}，假期要好好休息。" },
            { id: 'holiday5', parentLang: "Happy holidays, {name}!", kidLang: "{name}，节日快乐！" },
        ]
    },
    { 
        id: 'birthday',
        title: "Birthday",
        order: 6,
        phrases: [
            { id: 'birthday1', parentLang: "Happy birthday, {name}! Hope all your wishes come true!", kidLang: "生日快乐，{name}！希望你所有的愿望都能实现！" },
            { id: 'birthday2', parentLang: "Wishing you the happiest birthday, {name}!", kidLang: "祝你生日最快乐，{name}！" },
            { id: 'birthday3', parentLang: "Another year older and wiser, {name}!", kidLang: "又长大了一岁，{name}！" },
            { id: 'birthday4', parentLang: "Can't wait to celebrate with you, {name}!", kidLang: "迫不及待要和你一起庆祝，{name}！" },
            { id: 'birthday5', parentLang: "You're growing up so fast, {name}!", kidLang: "{name}，你长得太快了！" },
        ]
    },
    { 
        id: 'christmas',
        title: "Christmas",
        order: 7,
        phrases: [
            { id: 'christmas1', parentLang: "Merry Christmas, {name}!", kidLang: "圣诞快乐，{name}！" },
            { id: 'christmas2', parentLang: "Santa is coming soon, {name}!", kidLang: "{name}，圣诞老人就要来了！" },
            { id: 'christmas3', parentLang: "Have you been good this year, {name}?", kidLang: "{name}，你今年表现好吗？" },
            { id: 'christmas4', parentLang: "Can't wait to open presents with you, {name}!", kidLang: "迫不及待要和你一起拆礼物，{name}！" },
            { id: 'christmas5', parentLang: "The Christmas tree looks beautiful, {name}.", kidLang: "{name}，圣诞树真漂亮。" },
        ]
    },
    { 
        id: 'special-events',
        title: "Special Events",
        order: 8,
        phrases: [
            { id: 'special1', parentLang: "Happy New Year, {name}! This will be an amazing year!", kidLang: "新年快乐，{name}！这将是美好的一年！" },
            { id: 'special2', parentLang: "Congratulations on your achievement, {name}!", kidLang: "恭喜你取得成就，{name}！" },
            { id: 'special3', parentLang: "Today is a special day, {name}!", kidLang: "今天是特别的日子，{name}！" },
            { id: 'special4', parentLang: "You did something amazing today, {name}!", kidLang: "{name}，你今天做了了不起的事！" },
            { id: 'special5', parentLang: "Let's celebrate together, {name}!", kidLang: "我们一起庆祝吧，{name}！" },
            { id: 'special6', parentLang: "This moment is so precious, {name}.", kidLang: "这个时刻很珍贵，{name}。" },
        ]
    }
];