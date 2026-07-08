// src/services/wordStudy.ts

interface WordDefinition {
  word: string;
  meaning: string;
  origin: string;
  usage: string;
  references: string[];
}

// Common Bible words with definitions
const BIBLE_WORDS: Record<string, WordDefinition> = {
  'grace': {
    word: 'Grace',
    meaning: 'Unmerited favor; God giving us what we don\'t deserve',
    origin: 'Greek: "charis" (χάρις) - goodwill, loving-kindness, favor',
    usage: 'Used 170+ times in the New Testament to describe God\'s gift of salvation',
    references: ['Ephesians 2:8', 'Romans 3:24', '2 Corinthians 12:9', 'Titus 2:11']
  },
  'faith': {
    word: 'Faith',
    meaning: 'Complete trust or confidence in God; belief without physical proof',
    origin: 'Greek: "pistis" (πίστις) - conviction, trust, belief',
    usage: 'Central to Christian salvation; "The just shall live by faith"',
    references: ['Hebrews 11:1', 'Romans 10:17', 'James 2:17', 'Galatians 2:20']
  },
  'love': {
    word: 'Love',
    meaning: 'Selfless, unconditional affection; the highest Christian virtue',
    origin: 'Greek: "agape" (ἀγάπη) - divine, unconditional love',
    usage: 'Different from "phileo" (brotherly love) and "eros" (romantic love)',
    references: ['1 Corinthians 13:4-8', 'John 3:16', '1 John 4:8', 'Romans 5:8']
  },
  'righteousness': {
    word: 'Righteousness',
    meaning: 'Moral rightness; being in right standing with God',
    origin: 'Greek: "dikaiosyne" (δικαιοσύνη) - justice, righteousness',
    usage: 'Both imputed (given by God) and practical (lived out)',
    references: ['Romans 3:22', 'Matthew 6:33', '2 Corinthians 5:21', 'Philippians 3:9']
  },
  'mercy': {
    word: 'Mercy',
    meaning: 'Compassion shown to those in distress; not getting what we deserve',
    origin: 'Greek: "eleos" (ἔλεος) - compassion, pity, mercy',
    usage: 'Often paired with grace; God\'s mercy withholds punishment',
    references: ['Lamentations 3:22-23', 'Micah 6:8', 'Luke 6:36', 'Ephesians 2:4']
  },
  'peace': {
    word: 'Peace',
    meaning: 'Inner tranquility and harmony with God; freedom from anxiety',
    origin: 'Greek: "eirene" (εἰρήνη) - peace, rest, quietness',
    usage: 'More than absence of conflict; a positive state of wholeness',
    references: ['John 14:27', 'Philippians 4:7', 'Isaiah 26:3', 'Romans 5:1']
  },
  'hope': {
    word: 'Hope',
    meaning: 'Confident expectation of God\'s promises; not wishful thinking',
    origin: 'Greek: "elpis" (ἐλπίς) - expectation, trust, confidence',
    usage: 'Biblical hope is certain, based on God\'s character and promises',
    references: ['Jeremiah 29:11', 'Romans 15:13', 'Hebrews 6:19', '1 Peter 1:3']
  },
  'salvation': {
    word: 'Salvation',
    meaning: 'Deliverance from sin and its consequences; eternal life with God',
    origin: 'Greek: "soteria" (σωτηρία) - deliverance, preservation, salvation',
    usage: 'Past (justification), present (sanctification), and future (glorification)',
    references: ['Acts 4:12', 'Romans 10:9', 'Ephesians 2:8', 'John 3:16']
  },
  'glory': {
    word: 'Glory',
    meaning: 'The manifest presence, splendor, and majesty of God',
    origin: 'Greek: "doxa" (δόξα) - glory, honor, praise, worship',
    usage: 'Describes God\'s visible presence and the honor due to Him',
    references: ['Exodus 33:18-19', 'Isaiah 6:3', 'John 1:14', 'Romans 3:23']
  },
  'holiness': {
    word: 'Holiness',
    meaning: 'Being set apart for God; moral purity and sacredness',
    origin: 'Greek: "hagiasmos" (ἁγιασμός) - sanctification, holiness',
    usage: 'God is holy, and calls His people to be holy',
    references: ['Leviticus 19:2', 'Isaiah 6:3', '1 Peter 1:16', 'Hebrews 12:14']
  }
};

// Commentary notes covering one key verse from each book of the Bible 
const VERSE_COMMENTARY: Record<string, string> = {
  
  // PENTATEUCH (Genesis - Deuteronomy)
  'Genesis 1:1': 'The foundational verse of all Scripture. "In the beginning" marks the start of time and history. "God" (Elohim) is a plural noun used with a singular verb, hinting at the Trinity. "Created" (bara) means to create out of nothing (ex nihilo). This sets God as the sovereign source of all existence.',
  'Exodus 3:14': 'God reveals His name to Moses as "I AM WHO I AM" (YHWH). This speaks of His self-existence, eternal nature, and absolute constancy. He is the God who is always present and active. Jesus later uses this name for Himself in John 8:58, claiming deity.',
  'Leviticus 19:2': 'The call to holiness is the central theme of Leviticus. "Be holy because I am holy" sets God\'s character as the standard for His people. Holiness means being set apart for God\'s purposes, morally pure, and distinct from the surrounding pagan cultures.',
  'Numbers 6:24-26': 'The Aaronic Priestly Blessing is a beautiful picture of God\'s grace. "The LORD bless you and keep you" speaks of provision and protection. "Make His face shine upon you" suggests divine favor and approval. It culminates in "peace" (shalom)—complete well-being.',
  'Deuteronomy 6:4-5': 'Known as the Shema, this is the heartbeat of Judaism and the Old Testament. "The LORD our God, the LORD is one" affirms strict monotheism. The response is total love—with all heart (emotions), soul (will), and strength (resources). Jesus calls this the greatest commandment.',

  // HISTORICAL BOOKS (Joshua - Esther)
  'Joshua 1:9': 'God\'s charge to Joshua as he leads Israel into the Promised Land. "Be strong and courageous" is repeated three times in the chapter. The basis for courage is not human ability but God\'s presence: "I will be with you." This reflects the principle that God\'s presence enables God\'s mission.',
  'Judges 21:25': 'This sad summary explains the chaos in the book. "Everyone did what was right in his own eyes" describes moral relativism and spiritual anarchy. The tragic cycle of Israel\'s sin, oppression, cries for help, and deliverance shows the need for a godly king—ultimately, a need for Christ.',
  'Ruth 1:16': 'A beautiful declaration of covenant loyalty (hesed). Ruth, a Moabite outsider, chooses Naomi and her God. This verse shows that true faith transcends ethnic boundaries. Ruth\'s commitment foreshadows the inclusion of Gentiles into God\'s family and leads to the lineage of David and Jesus.',
  '1 Samuel 16:7': 'God rejects outward appearances and human criteria for leadership. "Man looks at the outward appearance, but the LORD looks at the heart." This is a key lesson for David\'s anointing. It reminds us that God values inner character—faith, humility, and integrity—over external attractiveness or stature.',
  '2 Samuel 22:3': 'David\'s song of deliverance uses military and natural imagery to describe God as his ultimate protector. "My rock" (stability), "fortress" (defense), and "deliverer" (rescue) present God as a powerful refuge. This psalm portrays God as the warrior-king who fights for His anointed.',
  '1 Kings 19:12': 'After the dramatic display of wind, earthquake, and fire, God meets Elijah in a "still small voice" (or gentle whisper). This teaches that God\'s presence is not always in the spectacular but often in the quiet and personal. It\'s a lesson in listening for God\'s gentle guidance amid chaos.',
  '2 Kings 6:16': 'Elisha prays for his servant to see the spiritual reality. "Those who are with us are more than those who are with them." The hills were full of fiery chariots—God\'s angelic army. This verse encourages believers to trust God\'s invisible protection when overwhelmed by visible circumstances.',
  '1 Chronicles 16:11': 'David\'s psalm of thanksgiving after bringing the Ark to Jerusalem. "Seek the LORD and His strength; seek His presence continually." This emphasizes seeking God\'s face (presence) over seeking His hand (blessings). It defines the believer\'s life as a continuous pursuit of intimacy with God.',
  '2 Chronicles 7:14': 'God\'s conditional promise for national healing. The fourfold response—humble, pray, seek, and turn (repent)—is required from God\'s people. This verse is a blueprint for revival, showing that restoration begins not with the world but with the church humbling itself before God.',
  'Ezra 1:1': 'This marks the fulfillment of Jeremiah\'s prophecy and the end of the Babylonian captivity. God "stirred the spirit" of Cyrus, a pagan king, to allow Israel\'s return. It shows God\'s sovereignty over history and nations; He uses secular rulers to accomplish His divine purposes of restoration.',
  'Nehemiah 1:4': 'Nehemiah\'s initial response to devastating news is intense prayer. He fasts, weeps, and mourns for days. This reveals a leader who engages in spiritual work before physical work. His prayer (a pattern of confession and intercession) precedes his petition to the king, showing prayer as the foundation for action.',
  'Esther 4:14': 'Mordecai\'s challenge to Esther is a powerful call to divine destiny. "For such a time as this" suggests God\'s perfect timing and providential placement. Even though God is not mentioned in the book, His sovereignty is implicit—He places His people strategically to act as deliverers in moments of crisis.',

  // WISDOM/POETRY (Job - Song of Solomon)
  'Job 1:21': 'Job\'s incredible response to his suffering displays mature faith. "Naked I came... and naked I shall return" acknowledges the temporality of material possessions. "The LORD gave, and the LORD has taken away" attributes both blessing and trial to God. The key is "blessed be the name of the LORD"—worship in pain.',
  'Psalm 23:1': 'David, a former shepherd, uses this metaphor to describe God\'s care. The Lord provides, guides, and protects like a shepherd with his sheep. "I shall not want" expresses complete trust in God\'s provision.',
  'Psalm 119:105': 'This is a declaration of the power of Scripture. "Lamp" suggests guidance for the present step, and "light" suggests broader illumination for the path ahead. The Word is not just information; it is illumination, revealing God\'s will and exposing the darkness of sin. It is essential for daily walking in faith.',
  'Proverbs 3:5-6': 'Trust in God requires letting go of self-reliance. "Lean not" suggests our own understanding is unstable. Acknowledging God in all ways leads to His guidance on the right path.',
  'Proverbs 9:10': 'This is the central thesis of Proverbs. "Fear of the LORD" is not terror but reverence, awe, and humble submission to God. It is the starting point for true knowledge. This is a moral and spiritual foundation; without it, human knowledge is foolish and misses the ultimate truth about God and life.',
  'Ecclesiastes 1:2': 'Solomon\'s famous refrain, "vanity of vanities," comes from the Hebrew "hebel," meaning vapor, breath, or meaninglessness. It describes life "under the sun"—life lived without God as the center. All human efforts, pleasures, and achievements are fleeting and empty when pursued as the ultimate goal.',
  'Song of Solomon 8:7': 'This verse celebrates the nature of true, godly love. "Many waters cannot quench love" shows its strength and durability against trials and opposition. It cannot be bought, highlighting its value is beyond material wealth. This is often read as an allegory of Christ\'s unquenchable love for His church.',

  // MAJOR PROPHETS (Isaiah - Daniel)
  'Isaiah 40:31': 'Waiting on the Lord means actively trusting and hoping in Him. Eagles soar effortlessly on thermal currents - a picture of how God empowers those who trust Him. The strength is renewed, not just given once.',
  'Isaiah 53:6': 'The heart of the Gospel in the Old Testament. "We all, like sheep, have gone astray" confesses universal human sinfulness and our tendency to wander from God. "The LORD has laid on Him the iniquity of us all" declares the great exchange—the guilt and punishment for our sin were placed on the suffering servant (Jesus).',
  'Jeremiah 1:5': 'God\'s call of Jeremiah reveals His sovereignty and intimate knowledge of His servants. "I knew you" implies a personal, covenantal relationship before birth. "I appointed you" speaks of divine predestination and purpose. This is a foundational verse for understanding that God\'s calling precedes human action and ability.',
  'Jeremiah 29:11': 'God spoke this to Israel in exile - a promise of restoration after 70 years. It shows God has plans even in difficult times. The plans are for a "future and a hope" - collective, not just individual.',
  'Lamentations 3:22-23': 'A beacon of hope in a book of sorrow. "The steadfast love of the LORD never ceases" speaks of God\'s faithful, covenant-keeping love (hesed). "His mercies are new every morning" shows that God\'s compassion is fresh and available daily, not an exhausted supply. It anchors hope in God\'s character, not in circumstances.',
  'Ezekiel 36:26': 'A central promise of the New Covenant. "A new heart" and "new spirit" point to an inner transformation, not just external reformation. "The heart of stone" represents a stubborn, unresponsive nature. "The heart of flesh" represents a heart made soft, sensitive, and responsive to God through regeneration by the Holy Spirit.',
  'Daniel 2:20-21': 'Daniel\'s response to God revealing Nebuchadnezzar\'s dream is a profound doxology. He blesses God for wisdom and might, but specifically acknowledges that God "changes times and seasons" and "removes kings and establishes kings." It is a powerful assertion of God\'s absolute sovereignty over human history and political power.',

  // MINOR PROPHETS (Hosea - Malachi)
  'Hosea 6:6': 'God\'s heart is revealed in this plea. "I desire steadfast love (hesed) and not sacrifice." God values relational loyalty and covenantal love over empty ritual and religiosity. "Knowledge of God" is more important than burnt offerings. This emphasizes that genuine relationship with God, marked by mercy, is His true desire.',
  'Joel 2:28': 'A pivotal prophecy of the Holy Spirit\'s outpouring, quoted by Peter at Pentecost. "Pour out My Spirit on all flesh" breaks Old Testament boundaries—the Spirit is no longer just for prophets, kings, or priests but for all people (young, old, men, women). It ushers in the Messianic Age and empowers the church for witness.',
  'Amos 5:24': 'A powerful call for social justice. "Let justice roll down like waters, and righteousness like an ever-flowing stream." In a context of empty worship and oppression, God demands that justice and righteousness be as constant and life-giving as a flowing river. It shows that true worship must be accompanied by ethical living and care for the poor.',
  'Obadiah 1:15': 'A warning to Edom and all nations. "As you have done, it shall be done to you" is the principle of just retribution (lex talionis). God is the judge of all nations. Those who rejoice in Israel\'s downfall will face God\'s judgment. This verse reminds us that God sees all injustice and will bring about ultimate accountability.',
  'Jonah 2:8': 'Jonah\'s prayer from the fish acknowledges the futility of idolatry. "Those who pay regard to vain idols forsake their hope of steadfast love." Even inside the fish, Jonah repents of running from God. He realizes that salvation comes only from the LORD (v.9). This verse speaks to the foolishness of trusting anything other than God.',
  'Micah 6:8': 'Perhaps the most concise summary of God\'s requirements. "To act justly" means pursuing fairness and standing up for the oppressed. "To love mercy/kindness" (hesed) means cherishing lovingkindness. "To walk humbly with your God" means living in daily, dependent fellowship with Him. It summarizes the ethical demands of the covenant—justice, mercy, and humility.',
  'Nahum 1:7': 'A verse of comfort within a book of judgment on Nineveh. "The LORD is good, a stronghold in the day of trouble." For those who trust in Him, God is a protective refuge. "He knows those who take refuge in Him" speaks of intimate care and knowledge. It contrasts God\'s goodness to His people with His judgment on His enemies.',
  'Habakkuk 3:17-18': 'This is the climax of Habakkuk\'s journey from doubt to faith. Despite total economic collapse and loss—no fruit, no harvest, no livestock—he declares, "Yet I will rejoice in the LORD." His joy is based on God\'s character as the God of his salvation, not on earthly circumstances. It is a radical, unconditional faith.',
  'Zephaniah 3:17': 'This is a beautiful picture of God\'s joyful love for His people. "The LORD your God is in your midst" assures His presence. "He will rejoice over you with gladness" speaks of God\'s emotional involvement. "He will quiet you by His love" suggests a calming, reassuring peace from God\'s affection. It ends with God singing—a profound image of divine joy.',
  'Haggai 1:5': 'God challenges the people for prioritizing their own comfort over His work. "Consider your ways" is a call to self-examination and repentance. The people had built beautiful homes while the Temple lay in ruins. This verse teaches that misplaced priorities lead to frustration and lack of blessing, and prioritizing God\'s work brings spiritual and material restoration.',
  'Zechariah 4:6': 'The key message of the book: God\'s work is not accomplished by human power or might but by His Spirit. "Not by might, nor by power, but by My Spirit, says the LORD of hosts." Zerubbabel\'s rebuilding of the Temple would not be achieved through political alliances or military force, but through divine enabling. It teaches reliance on the Holy Spirit.',
  'Malachi 3:10': 'A call to faithful stewardship and a challenge to test God\'s faithfulness in material provision. "Bring the full tithe... and see if I will not open the windows of heaven." This is the only place where God invites His people to test Him. It connects obedience in giving with divine blessing and provision, showing that generosity is a matter of faith and priority.',

  // GOSPELS (Matthew - John)
  'Matthew 6:33': 'Part of the Sermon on the Mount. Jesus teaches that seeking God\'s kingdom should be the priority, and material needs will be provided. "Righteousness" here means right living according to God\'s standards.',
  'Matthew 28:19-20': 'The Great Commission is Jesus\' final mandate to His disciples. "Go therefore" is grounded in His authority. "Make disciples of all nations" breaks Jewish exclusivity and extends the gospel globally. "Baptizing them... teaching them" outlines the process of discipleship—initiation and instruction. "I am with you always" is the promise of His abiding presence, which empowers the mission.',
  'Mark 10:45': 'This verse is the key to understanding Mark\'s Gospel. Jesus defines His mission: not to be served, but to serve, and to give His life as a ransom for many. "Ransom" (lutron) is a payment to set captives free. Jesus portrays His death as a substitutionary atonement—Himself as the payment to liberate sinners from the penalty of sin.',
  'Luke 19:10': 'This is Luke\'s central theme: Jesus came to seek and save the lost. This explains Jesus\' association with sinners, tax collectors, and outcasts. He seeks those who are spiritually lost, showing God\'s initiative and grace in salvation. The mission is not to the righteous, but to those who are lost and broken, needing a Savior.',
  'John 1:14': 'The profound mystery of the Incarnation. "The Word became flesh" means the eternal Son of God took on full humanity. He "dwelt among us" (tabernacled) like the glory cloud in the Old Testament. "We have seen His glory" is the testimony of the disciples who witnessed His divine majesty. "Full of grace and truth" reveals the nature of His person—He is the ultimate revelation of God\'s character.',
  'John 3:16': 'Perhaps the most famous verse in the Bible. It summarizes the entire gospel: God\'s love motivated Him to send Jesus, so that anyone who believes can have eternal life. The word "world" (Greek: kosmos) shows God\'s love extends to all people.',

  // ACTS
  'Acts 1:8': 'This is the thesis verse for the book of Acts. "You will receive power when the Holy Spirit has come upon you" is the promise of divine enablement. The geographic expansion—Jerusalem, Judea, Samaria, and the ends of the earth—is the outline for the book. It shows that witnessing is not just a task but a result of the Spirit\'s work, moving outward in concentric circles.',

  // PAULINE EPISTLES (Romans - Philemon)
  'Romans 3:23-24': 'These verses capture the universal human condition and the divine solution. "For all have sinned" is the diagnosis—falling short of God\'s glory. "And are justified freely by His grace" is the remedy—declared righteous through faith in Christ. "Through the redemption that is in Christ Jesus" explains the mechanism; Christ\'s sacrifice secures our freedom from sin\'s penalty. Salvation is a gift, not a wage.',
  'Romans 8:28': 'This verse doesn\'t promise that everything will be good, but that God works THROUGH everything for good. The "good" is defined in verse 29 - being conformed to Christ\'s image.',
  '1 Corinthians 13:4-5': 'This is the definition and expression of agape love—not just a feeling but a decisive action. "Love is patient, kind..." The negative qualities (not envious, boastful, proud, etc.) describe what love is not. These behaviors are actively chosen in relationship. This chapter describes the essential fruit that should characterize every Christian community and the most excellent way.',
  '2 Corinthians 5:17': 'The radical change that occurs in a believer. "In Christ" is the key phrase—a new creation status. "Old things have passed away" refers to the old life of sin and condemnation. "All things have become new" is not just a moral improvement but a complete renovation of identity, purpose, and destiny. It is a present reality in Christ.',
  'Galatians 2:20': 'This is Paul\'s personal gospel in a nutshell. "I have been crucified with Christ" means death to the old self and bondage to the law. "It is no longer I who live, but Christ who lives in me" describes union with Christ—His life becomes the believer\'s life. "I live by faith in the Son of God" is the means of this new life, motivated by Christ\'s self-giving love.',
  'Galatians 5:22-23': 'The fruit of the Spirit is singular (not "fruits"). These nine qualities grow together as one harvest of character. They contrast with the "works of the flesh" listed earlier in the chapter.',
  'Ephesians 2:8-9': 'This is the definitive statement on salvation by grace alone, through faith alone. "You have been saved" is a past event, a finished work. "It is the gift of God" emphasizes it cannot be earned. "Not by works" excludes human boasting. Salvation is God\'s gracious initiative, received through faith, making it secure and a foundation for good works (v.10).',
  'Philippians 2:5-7': 'This is the "Kenosis" (self-emptying) passage. Christ, though in the form of God (pre-existent, divine), did not cling to His status but emptied Himself by taking the form of a servant, being made in human likeness. This is the ultimate model of humility and self-sacrifice. His "emptying" was not a loss of divinity but an addition of humanity, leading to the cross and ultimate exaltation.',
  'Philippians 4:13': 'Often quoted for sports or achievements, but context is about contentment in all circumstances (v.11-12). Paul wrote this from prison, showing strength comes from Christ, not circumstances.',
  'Colossians 1:15-16': 'A magnificent Christological hymn. Jesus is "the image of the invisible God"—He perfectly reveals the Father. "Firstborn over all creation" speaks of His preeminence and sovereignty, not that He was created. "By Him all things were created" asserts His role as the Creator of everything, both visible and invisible. This establishes Christ as preeminent over all, including spiritual powers.',
  '1 Thessalonians 4:16-17': 'This is the classic passage on the Rapture and the Second Coming. "The Lord Himself will descend from heaven" is a personal, physical return. The sequence—shout, voice of archangel, trumpet—is a call to resurrection. The dead in Christ rise first, then living believers are caught up (raptured). "Shall we always be with the Lord" is the ultimate hope of eternal fellowship, used here to encourage believers in grief.',
  '2 Thessalonians 3:10': 'A practical instruction for church order. "If anyone is not willing to work, let him not eat." This provides a corrective for idle believers who were using Christ\'s return as an excuse to avoid work. It teaches the responsibility of diligent labor and self-support, distinguishing between those who cannot work and those who will not work.',
  '1 Timothy 2:5': 'A foundational statement on Christ\'s mediatorship. "One God" affirms monotheism. "One mediator between God and men" means Jesus is the only access point to God. "The man Christ Jesus" emphasizes His humanity, necessary for Him to represent us. This verse refutes any need for other mediators (saints, angels) and affirms the sufficiency of Christ\'s work.',
  '2 Timothy 1:7': 'God doesn\'t give a spirit of fear (Greek: deilia - cowardice, timidity). Instead, He gives power, love, and a sound mind (Greek: sophronismos - self-control, discipline). Perfect for overcoming anxiety.',
  '2 Timothy 3:16-17': 'The definitive statement on the inspiration and sufficiency of Scripture. "All Scripture is inspired by God" (lit., God-breathed). The fourfold purpose—teaching, reproof, correction, training in righteousness—shows Scripture\'s comprehensive function. Its goal is to equip the man of God completely for every good work, making it sufficient for all matters of faith and practice.',
  'Titus 2:11-12': 'The grace of God is both saving and sanctifying. "Salvation has appeared to all people" is the first coming of Christ. Grace trains us "to renounce ungodliness and worldly passions"—that is, it educates and empowers us to say "No" to sin. It also teaches us to live godly lives "in the present age." Grace is the motivation and power for holy living, not a license to sin.',
  'Philemon 1:15': 'Paul\'s profound reflection on the power of redemption, even in a situation of loss. "Perhaps he was separated from you for a little while so that you might have him back forever." Paul sees Onesimus\'s flight and theft not just as a crime but as part of God\'s sovereign plan for a deeper, permanent relationship—now "a beloved brother." This is the redemptive restoration that the Gospel brings.',

  // HEBREWS
  'Hebrews 4:15-16': 'This reveals the unique qualifications of our Great High Priest, Jesus. He was "tempted in every way, just as we are"—fully human, yet "without sin." Therefore, we can have full confidence to approach God\'s throne. It is a throne of grace, not judgment. We receive mercy for past failures and grace for present help, especially in times of need. This is a precious invitation to prayer.',

  // GENERAL EPISTLES (James - Jude)
  'James 1:22': 'The call to practical obedience. "Do not merely listen to the word, and so deceive yourselves." Mere hearing without doing is self-deception. James emphasizes that true faith is active and works. This is not salvation by works, but salvation that works. It sets the tone for the entire book, calling believers to be "doers" of the Word, bridging the gap between profession and practice.',
  '1 Peter 2:9': 'This describes the identity and purpose of the church. Believers are "a chosen race, a royal priesthood, a holy nation"—all Old Testament language applied to the New Covenant community. The purpose is "that you may proclaim the excellencies of Him who called you." We are set apart not for privilege but for proclamation, to declare God\'s goodness and glory.',
  '2 Peter 1:20-21': 'A crucial statement on the nature of prophetic Scripture. "No prophecy of Scripture comes from someone\'s own interpretation" means that Scripture does not originate from human will or private opinions. "Men spoke from God as they were carried along by the Holy Spirit." This uses the imagery of a ship being moved by the wind—the Spirit is the active agent in the production of Scripture.',
  '1 John 1:9': 'A foundational promise for ongoing Christian fellowship with God. "If we confess our sins" is the condition—to agree with God, naming the sin for what it is. "He is faithful and just" shows God\'s character as the basis for forgiveness. "Forgive us our sins and cleanse us from all unrighteousness" describes the double benefit: relational restoration and inward purification.',
  '2 John 1:6': 'A concise summary of the Christian life. "Love" is the command, but it is defined by walking in obedience to God\'s commandments. It is a practical love, not just an emotion. "This is the love, that we walk according to his commandments." It shows that the truth (correct doctrine) and the walk (correct lifestyle) are inseparable.',
  '3 John 1:4': 'John expresses his greatest joy as a spiritual father. "I have no greater joy than to hear that my children are walking in the truth." This reveals the heart of a pastor and mentor. The greatest reward for spiritual leadership is not numbers or success, but seeing those you have discipled living in obedience to God\'s Word.',
  'Jude 1:3': 'This is a passionate call to defend the faith. "Contend for the faith that was once for all delivered to the saints." The faith is a fixed body of truth, delivered once and for all. "Contend" is a strong athletic/military term (epagonizomai), suggesting earnest effort against false teaching. This sets the urgent tone of the letter against those who distort God\'s grace into a license for sin.',

  // REVELATION
  'Revelation 21:4': 'The ultimate hope for the believer and the climax of the redemptive story. The new heaven and new earth will have no more death, sorrow, crying, or pain. "The former things have passed away" indicates a complete and final end to the curse of Genesis 3. This is not just a removal of negatives but the full establishment of God\'s good creation, where He dwells with His people directly.'
};

export function searchBibleWords(query: string): WordDefinition[] {
  const term = query.toLowerCase();
  return Object.values(BIBLE_WORDS).filter(w =>
    w.word.toLowerCase().includes(term) ||
    w.meaning.toLowerCase().includes(term) ||
    w.origin.toLowerCase().includes(term)
  );
}

export function getVerseCommentary(reference: string): string | null {
  return VERSE_COMMENTARY[reference] || null;
}

export function getWordStudy(word: string): WordDefinition | null {
  return BIBLE_WORDS[word.toLowerCase()] || null;
}

export function getPopularWords(): WordDefinition[] {
  return Object.values(BIBLE_WORDS).slice(0, 6);
}