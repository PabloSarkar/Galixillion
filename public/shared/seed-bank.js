// Built-in Daily Dive prompts, used when no LLM-generated dive exists for a date (local play, or
// before ANTHROPIC_API_KEY is configured). The answer lists only validate answers when no LLM is
// available; scoring always comes from corpus word frequency.
// Answer format: "Answer" or ["Answer", "alias", ...]

export const TOPICS = ["Geography & Culture", "Food & Drink", "Pop Culture & Entertainment", "Geography & Nature", "History & Society", "Science & Tech"];

export const SEED_BANK = [
  // ---------- Geography & Culture ----------
  {
    topic: "Geography & Culture", category: "Countries",
    q: "Name a landlocked country in Europe",
    criteria: "The answer must be a sovereign European country with no coastline on an ocean or sea. Transcontinental Armenia, Azerbaijan and Kazakhstan count. Kosovo counts.",
    a: ["Switzerland", "Austria", ["Czech Republic", "czechia"], "Slovakia", "Hungary", "Serbia", ["North Macedonia", "macedonia"], "Kosovo", "Belarus", "Moldova", "Luxembourg", "Liechtenstein", "Andorra", "San Marino", ["Vatican City", "vatican", "holy see"], "Armenia", "Azerbaijan", "Kazakhstan"],
  },
  {
    topic: "Geography & Culture", category: "Capitals",
    q: "Name a capital city in Africa",
    criteria: "The answer must be the current capital (official, administrative, legislative or judicial) of a sovereign African country. Former capitals are not accepted.",
    a: ["Cairo", "Nairobi", "Pretoria", "Cape Town", "Bloemfontein", "Abuja", "Addis Ababa", "Accra", "Dakar", "Rabat", "Algiers", "Tunis", "Tripoli", "Khartoum", "Juba", "Kampala", "Kigali", "Gitega", "Dodoma", "Lusaka", "Harare", "Maputo", "Lilongwe", "Gaborone", "Windhoek", "Luanda", "Kinshasa", "Brazzaville", "Libreville", "Yaoundé", "Bangui", "N'Djamena", "Niamey", "Bamako", "Ouagadougou", "Nouakchott", "Banjul", "Bissau", "Conakry", "Freetown", "Monrovia", "Yamoussoukro", "Lomé", "Porto-Novo", "Cotonou", "Malabo", "Ciudad de la Paz", "São Tomé", "Asmara", "Djibouti", "Mogadishu", "Antananarivo", "Port Louis", "Moroni", "Victoria", "Praia", "Maseru", "Mbabane", "Lobamba"],
  },
  {
    topic: "Geography & Culture", category: "Countries",
    q: "Name a country where French is an official language",
    criteria: "The answer must be a sovereign country where French is currently an official language at the national level. Regions and territories (Quebec, French Guiana) are not accepted.",
    a: ["France", "Belgium", "Switzerland", "Luxembourg", "Monaco", "Canada", "Haiti", "Senegal", "Ivory Coast", "Cameroon", ["Democratic Republic of the Congo", "drc", "dr congo"], ["Republic of the Congo", "congo"], "Madagascar", "Benin", "Togo", "Gabon", "Chad", ["Central African Republic", "car"], "Burundi", "Rwanda", "Djibouti", "Comoros", "Seychelles", "Equatorial Guinea", "Vanuatu"],
  },
  {
    topic: "Geography & Culture", category: "Countries",
    q: "Name a country in South America",
    criteria: "The answer must be one of the 12 sovereign countries of South America. Territories such as French Guiana or the Falkland Islands are not accepted.",
    a: ["Brazil", "Argentina", "Chile", "Peru", "Colombia", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname"],
  },
  {
    topic: "Geography & Culture", category: "Island nations",
    q: "Name an island nation",
    criteria: "The answer must be a sovereign country made up entirely of one or more islands. Countries that share an island (Haiti, Ireland) count. Australia is not accepted.",
    a: ["Japan", ["United Kingdom", "uk", "britain", "great britain"], "Ireland", "Iceland", "Madagascar", "Sri Lanka", "Philippines", "Indonesia", "New Zealand", "Cuba", "Jamaica", "Haiti", "Dominican Republic", "Malta", "Cyprus", "Bahrain", "Singapore", "Maldives", "Mauritius", "Seychelles", "Fiji", "Samoa", "Tonga", "Tuvalu", "Nauru", "Kiribati", "Vanuatu", "Solomon Islands", "Palau", "Micronesia", "Marshall Islands", "Papua New Guinea", ["Timor-Leste", "east timor"], "Brunei", "Taiwan", "Bahamas", "Barbados", "Trinidad and Tobago", "Grenada", "Saint Lucia", "Dominica", "Antigua and Barbuda", "Saint Kitts and Nevis", "Saint Vincent and the Grenadines", ["Cape Verde", "cabo verde"], "Comoros", "São Tomé and Príncipe"],
  },

  // ---------- Food & Drink ----------
  {
    topic: "Food & Drink", category: "Cheese",
    q: "Name a type of cheese",
    criteria: "The answer must be a recognized cheese variety or style. Brand names are not accepted.",
    a: ["Cheddar", "Mozzarella", "Brie", "Camembert", ["Parmesan", "parmigiano reggiano", "parmigiano"], "Gouda", "Edam", "Feta", ["Swiss", "swiss cheese"], ["Emmental", "emmentaler"], ["Gruyère", "gruyere"], "Roquefort", "Gorgonzola", "Stilton", "Ricotta", "Mascarpone", "Halloumi", "Manchego", "Pecorino", "Provolone", "Havarti", "Monterey Jack", "Colby", "Pepper Jack", "Cottage cheese", "Cream cheese", "Paneer", "Burrata", "Taleggio", "Fontina", "Asiago", "Comté", "Raclette", "Reblochon", "Wensleydale", "Red Leicester", "Double Gloucester", "Limburger", ["Munster", "muenster"], "Port Salut", "Jarlsberg", "Queso fresco", "Cotija", "Oaxaca", "Époisses", "Morbier", "Caerphilly", "Lancashire", "Cheshire", "Stracchino", "Scamorza", "Labneh", "Quark"],
  },
  {
    topic: "Food & Drink", category: "Herbs",
    q: "Name a herb used in cooking",
    criteria: "The answer must be a leafy culinary herb. Spices made from seeds, bark or roots (cinnamon, cumin, ginger) are not accepted.",
    a: ["Basil", "Parsley", ["Cilantro", "coriander"], "Mint", "Rosemary", "Thyme", "Oregano", "Sage", "Dill", "Chives", "Tarragon", ["Bay leaf", "bay"], "Marjoram", "Lemongrass", "Chervil", "Lovage", "Savory", "Sorrel", "Borage", "Epazote", ["Shiso", "perilla"], "Culantro", "Curry leaf", "Lemon balm", "Hyssop", "Thai basil", "Fennel fronds", "Lemon verbena", "Fenugreek leaves", "Wild garlic"],
  },
  {
    topic: "Food & Drink", category: "Pasta",
    q: "Name a pasta shape",
    criteria: "The answer must be a named shape or type of Italian-style pasta. Finished dishes (carbonara) and sauces are not accepted.",
    a: ["Spaghetti", "Penne", "Fusilli", ["Farfalle", "bow tie", "bowtie"], "Rigatoni", "Linguine", "Fettuccine", "Tagliatelle", ["Lasagne", "lasagna"], "Macaroni", "Orzo", "Ravioli", "Tortellini", ["Conchiglie", "shells"], "Orecchiette", "Pappardelle", "Ziti", "Bucatini", "Cavatappi", "Rotini", "Vermicelli", ["Capellini", "angel hair"], "Radiatori", "Ditalini", "Cannelloni", "Manicotti", "Paccheri", "Gemelli", "Trofie", "Strozzapreti", "Casarecce", "Mafaldine", "Campanelle", "Tortiglioni", "Anelli", "Stelline", "Agnolotti", "Cappelletti", "Garganelli", "Fregola", "Lumache", "Pici", "Cavatelli", "Malloreddus", "Tortelloni", "Mezzi rigatoni", "Spaghettini", "Bigoli", "Corzetti"],
  },
  {
    topic: "Food & Drink", category: "Cocktails",
    q: "Name a cocktail",
    criteria: "The answer must be a named mixed drink containing alcohol. Single spirits served neat and brand names are not accepted.",
    a: ["Mojito", "Margarita", "Martini", "Old Fashioned", "Manhattan", "Negroni", "Daiquiri", ["Piña Colada", "pina colada"], "Cosmopolitan", "Bloody Mary", "Mai Tai", "Moscow Mule", "Whiskey Sour", "Tom Collins", "Gin and Tonic", ["Aperol Spritz", "spritz"], "Sidecar", "Sazerac", "Mint Julep", "Caipirinha", "Long Island Iced Tea", "Tequila Sunrise", "Paloma", "White Russian", "Black Russian", "Espresso Martini", "Gimlet", "French 75", "Bellini", "Mimosa", ["Dark 'n' Stormy", "dark and stormy"], "Cuba Libre", "Hurricane", "Zombie", "Singapore Sling", "Aviation", "Last Word", "Boulevardier", "Vesper", "Sex on the Beach", "Grasshopper", "Pisco Sour", "Rob Roy", "Rusty Nail", "Bramble", "Corpse Reviver", "Penicillin", "Clover Club", "Kir Royale", "Irish Coffee", "Hanky Panky", "Americano", "Sea Breeze", "Mudslide", "Amaretto Sour"],
  },
  {
    topic: "Food & Drink", category: "Bread",
    q: "Name a type of bread",
    criteria: "The answer must be a recognized type or style of bread, including flatbreads. Pastries (croissant), cakes and brand names are not accepted.",
    a: ["Baguette", "Sourdough", "Ciabatta", "Focaccia", "Rye", "Pumpernickel", "Brioche", "Challah", "Naan", "Pita", "Tortilla", "Bagel", "Soda bread", "Cornbread", "Banana bread", "Matzo", "Chapati", "Roti", "Paratha", "Injera", "Lavash", "Flatbread", "English muffin", "Pretzel", "Babka", "Panettone", "Stollen", "White bread", ["Whole wheat", "wholemeal"], "Multigrain", "Milk bread", "Bao", "Arepa", "Grissini", "Pain de mie", "Bialy", "Fougasse", "Sangak", "Barbari", "Kulcha", "Puri", "Bhatura", "Pandesal", "Potato bread", "Zopf", "Rugbrød", "Pane carasau", "Simit", "Khachapuri", "Damper", "Bannock", "Brown bread", "Crispbread"],
  },

  // ---------- Pop Culture & Entertainment ----------
  {
    topic: "Pop Culture & Entertainment", category: "TV",
    q: "Name a sitcom set in New York City",
    criteria: "The answer must be a television sitcom or comedy series set primarily in New York City. Shows set elsewhere in New York State are not accepted.",
    a: ["Friends", "Seinfeld", "How I Met Your Mother", "30 Rock", "Broad City", "Taxi", "Night Court", ["Will & Grace", "will and grace"], "The Nanny", "Mad About You", "Everybody Hates Chris", "2 Broke Girls", ["Brooklyn Nine-Nine", "brooklyn 99", "brooklyn nine nine"], "The King of Queens", "Sex and the City", "The Odd Couple", "The Honeymooners", "I Love Lucy", "Spin City", "Girls", "Unbreakable Kimmy Schmidt", "The Jeffersons", "Welcome Back, Kotter", "Barney Miller", "Diff'rent Strokes", "The Cosby Show", "Living Single", "Rhoda", "Ugly Betty", "Only Murders in the Building", "Girls5eva", "Younger", "Great News", "Russian Doll", "The Marvelous Mrs. Maisel", "Master of None", "High Maintenance", "Search Party"],
  },
  {
    topic: "Pop Culture & Entertainment", category: "Film",
    q: "Name an actor who has played Batman in live action",
    criteria: "The answer must be an actor who played Batman (Bruce Wayne in costume) in a live-action film, serial or TV series.",
    a: [["Christian Bale", "bale"], ["Ben Affleck", "affleck"], ["Michael Keaton", "keaton"], ["Robert Pattinson", "pattinson"], ["George Clooney", "clooney"], ["Val Kilmer", "kilmer"], ["Adam West", "west"], ["Lewis Wilson"], ["Robert Lowery"], ["Iain Glen"]],
  },
  {
    topic: "Pop Culture & Entertainment", category: "Fiction",
    q: "Name a fictional wizard, witch or sorcerer",
    criteria: "The answer must be a named fictional character who is a wizard, witch, sorcerer or mage in books, film, TV, comics or games.",
    a: ["Harry Potter", "Gandalf", "Merlin", ["Albus Dumbledore", "dumbledore"], ["Hermione Granger", "hermione"], ["Lord Voldemort", "voldemort"], ["Severus Snape", "snape"], "Saruman", "Radagast", ["Doctor Strange", "dr strange"], "Rincewind", ["Ged", "sparrowhawk"], "Elminster", "Raistlin", "Prospero", ["Yen Sid"], "Jafar", "Gargamel", "Howl", "Zatanna", ["John Constantine", "constantine"], "Dr. Orpheus", ["Glinda"], ["The Wizard of Oz", "oz"], "Allanon", "Belgarath", "Polgara", "Pug", "Elric", "Mordenkainen", ["Gellert Grindelwald", "grindelwald"], ["Morgan le Fay", "morgana"], "Shazam", "Tim the Enchanter", "Maleficent", "Yennefer", ["Harry Dresden", "dresden"], "Jonathan Strange", "Mr Norrell", "Schmendrick", "Medivh", "Khadgar", "Jaina Proudmoore", "Willow Rosenberg", "Sabrina Spellman", "Scarlet Witch", "Ursula", "Ron Weasley", "Sirius Black", "Minerva McGonagall", "Bellatrix Lestrange", "Rand al'Thor", "Moiraine", "Quentin Coldwater", "Kvothe"],
  },
  {
    topic: "Pop Culture & Entertainment", category: "Music",
    q: "Name a Beatles song",
    criteria: "The answer must be the title of a song recorded and released by the Beatles, including covers they released.",
    a: ["Hey Jude", "Let It Be", "Yesterday", "Help!", "Come Together", "Here Comes the Sun", "Something", "Yellow Submarine", "A Day in the Life", "Penny Lane", "Strawberry Fields Forever", "All You Need Is Love", "Eleanor Rigby", "Blackbird", "Twist and Shout", "I Want to Hold Your Hand", "She Loves You", "Can't Buy Me Love", "A Hard Day's Night", "Love Me Do", "Please Please Me", "Ticket to Ride", "Day Tripper", "We Can Work It Out", "Paperback Writer", "Get Back", "Lucy in the Sky with Diamonds", "With a Little Help from My Friends", "Sgt. Pepper's Lonely Hearts Club Band", "Revolution", "Helter Skelter", "Ob-La-Di, Ob-La-Da", "Back in the U.S.S.R.", "While My Guitar Gently Weeps", "Norwegian Wood", "In My Life", "Michelle", "Nowhere Man", "Drive My Car", "Taxman", "Here, There and Everywhere", "Octopus's Garden", "Golden Slumbers", "Across the Universe", "The Long and Winding Road", "I Am the Walrus", "Magical Mystery Tour", "Hello, Goodbye", "Lady Madonna", "Dear Prudence", "I Feel Fine", "Eight Days a Week", "I Saw Her Standing There", "All My Loving", "Tomorrow Never Knows", "Rain", "Now and Then", "Julia", "Rocky Raccoon", "Martha My Dear", "Glass Onion", "Good Day Sunshine", "She's Leaving Home", "When I'm Sixty-Four", "Maxwell's Silver Hammer", "Oh! Darling", "Because", "Sun King", "Mean Mr. Mustard", "Polythene Pam", "Her Majesty", "Two of Us", "Don't Let Me Down", "The Ballad of John and Yoko", "Hey Bulldog", "And I Love Her", "If I Fell", "Rock and Roll Music", "Act Naturally", "Girl", "For No One", "Savoy Truffle", "Piggies", "Birthday"],
  },
  {
    topic: "Pop Culture & Entertainment", category: "Film",
    q: "Name a Pixar feature film",
    criteria: "The answer must be the title of a feature-length film produced by Pixar Animation Studios. Shorts and series are not accepted.",
    a: ["Toy Story", "Toy Story 2", "Toy Story 3", "Toy Story 4", "A Bug's Life", ["Monsters, Inc.", "monsters inc"], "Finding Nemo", "The Incredibles", "Cars", "Cars 2", "Cars 3", "Ratatouille", ["WALL-E", "wall e", "walle"], "Up", "Brave", "Monsters University", "Inside Out", "Inside Out 2", "The Good Dinosaur", "Finding Dory", "Coco", "Incredibles 2", "Onward", "Soul", "Luca", "Turning Red", "Lightyear", "Elemental", "Elio"],
  },

  // ---------- Geography & Nature ----------
  {
    topic: "Geography & Nature", category: "Volcanoes",
    q: "Name a volcano",
    criteria: "The answer must be a real active, dormant or extinct volcano on Earth. Volcanoes on other worlds are not accepted.",
    a: ["Vesuvius", "Fuji", "St. Helens", "Etna", "Kilauea", "Mauna Loa", "Mauna Kea", "Krakatoa", "Pinatubo", "Popocatépetl", "Cotopaxi", "Erebus", "Kilimanjaro", "Stromboli", "Eyjafjallajökull", "Hekla", "Rainier", "Hood", "Shasta", "Tambora", "Pelée", "Soufrière Hills", "Nyiragongo", "Ararat", "Elbrus", "Parícutin", "Teide", "Taal", "Merapi", "Sakurajima", "Ruapehu", "Taranaki", "Tongariro", "Yellowstone", "Katla", "Lassen", "Mayon", "Chimborazo", "Villarrica", "Ojos del Salado", "Hunga Tonga", "Anak Krakatau", ["Santorini", "thera"], "Fogo", "Laki", "Grímsvötn", "Unzen", "Agung", "Semeru", "Bromo", "Colima", "Arenal", "Pacaya", "Fuego", "Sinabung", "Nevado del Ruiz", "Pico de Orizaba", "Baker", "Surtsey", "Fagradalsfjall"],
  },
  {
    topic: "Geography & Nature", category: "Animals",
    q: "Name a marsupial or an egg-laying mammal",
    criteria: "The answer must be a marsupial or a monotreme (egg-laying mammal), living or extinct.",
    a: ["Kangaroo", "Koala", "Wombat", "Platypus", "Echidna", "Opossum", "Wallaby", "Quokka", "Tasmanian devil", "Sugar glider", "Bandicoot", "Bilby", "Numbat", "Quoll", "Possum", "Wallaroo", "Pademelon", "Bettong", "Potoroo", "Cuscus", "Tree kangaroo", "Marsupial mole", "Dunnart", "Antechinus", ["Thylacine", "tasmanian tiger"], "Honey possum", "Phascogale", "Kowari", "Mulgara", "Planigale", "Kultarr", "Ningaui", "Feathertail glider", "Monito del monte", "Shrew opossum", "Diprotodon", "Greater glider", "Rock-wallaby"],
  },
  {
    topic: "Geography & Nature", category: "Rivers",
    q: "Name a river in Europe",
    criteria: "The answer must be a river that flows mainly through Europe, including European Russia.",
    a: ["Danube", "Rhine", "Thames", "Seine", "Volga", "Elbe", "Loire", "Rhône", "Po", "Tiber", "Ebro", ["Tagus", "tejo"], "Douro", "Dnieper", "Don", "Oder", "Vistula", "Shannon", "Severn", "Mersey", "Tyne", "Trent", "Clyde", "Tay", "Spey", "Liffey", "Garonne", "Dordogne", ["Meuse", "maas"], "Scheldt", ["Moselle", "mosel"], "Main", "Neckar", "Weser", "Inn", "Drava", "Sava", "Tisza", "Morava", "Vltava", "Arno", "Adige", "Guadalquivir", "Guadiana", "Ural", "Kama", "Daugava", "Neman", "Narva", "Glomma", "Dniester", "Prut", "Pripyat", ["Maritsa", "evros"], "Struma", "Vardar", "Avon", "Ouse", "Dee", "Somme", "Marne", "Saône", "Isar", "Ruhr", "Northern Dvina", "Pechora", "Neva", "Göta älv", "Torne"],
  },
  {
    topic: "Geography & Nature", category: "Dogs",
    q: "Name a dog breed",
    criteria: "The answer must be a recognized purebred dog breed. Crossbreeds (labradoodle, cockapoo) are not accepted.",
    a: [["Labrador Retriever", "labrador", "lab"], "Golden Retriever", "German Shepherd", "Poodle", "Bulldog", "Beagle", "Dachshund", "Chihuahua", "Pug", "Boxer", "Rottweiler", ["Siberian Husky", "husky"], "Border Collie", ["Corgi", "welsh corgi"], "Shih Tzu", ["Yorkshire Terrier", "yorkie"], ["Dobermann", "doberman"], "Great Dane", "Dalmatian", "Greyhound", "Whippet", "Collie", "Cocker Spaniel", "Springer Spaniel", "Shiba Inu", "Akita", "Chow Chow", "Samoyed", ["Alaskan Malamute", "malamute"], "Bernese Mountain Dog", "Saint Bernard", "Newfoundland", "Mastiff", "Pomeranian", "Maltese", "Bichon Frise", "Schnauzer", "Weimaraner", "Vizsla", "Basset Hound", "Bloodhound", "Jack Russell Terrier", "Staffordshire Bull Terrier", "Boston Terrier", "French Bulldog", "Cavalier King Charles Spaniel", "Papillon", "Afghan Hound", "Borzoi", "Saluki", "Basenji", "Shar Pei", "Lhasa Apso", "Pekingese", "Havanese", "Keeshond", "Leonberger", "Komondor", "Puli", "Xoloitzcuintli", "Otterhound", "Lagotto Romagnolo", "Azawakh", "Mudi", "Sloughi", "Kooikerhondje", "Briard", "Bearded Collie", "Airedale Terrier", "Irish Wolfhound", "Scottish Deerhound", "Rhodesian Ridgeback", "Cane Corso", "Dogue de Bordeaux", "Australian Shepherd", ["Australian Cattle Dog", "blue heeler"], ["Shetland Sheepdog", "sheltie"], "Old English Sheepdog", "Bull Terrier", ["West Highland White Terrier", "westie"], "Scottish Terrier", "Cairn Terrier", "Bedlington Terrier", "Norfolk Terrier", "Norwich Terrier"],
  },
  {
    topic: "Geography & Nature", category: "Trees",
    q: "Name a tree that loses its leaves in autumn",
    criteria: "The answer must be a deciduous tree (including deciduous conifers such as larch). Evergreens are not accepted.",
    a: ["Oak", "Maple", "Birch", "Beech", "Ash", "Elm", "Willow", "Poplar", "Aspen", "Chestnut", "Horse chestnut", "Sycamore", ["Linden", "lime"], "Hornbeam", "Alder", "Walnut", "Hickory", "Ginkgo", "Larch", "Dawn redwood", "Bald cypress", "Cherry", "Apple", "Pear", "Plum", "Magnolia", "Dogwood", "Sweetgum", "Tulip tree", "Catalpa", "Hawthorn", ["Rowan", "mountain ash"], "Cottonwood", "Black locust", "Honey locust", "Mulberry", "Hazel", "Sassafras", "Tupelo", "Persimmon", "Buckeye", "Katsura", "Redbud", "Pecan", "Butternut", "Elder", "Crabapple", "Silver birch", "Tamarack", "Sumac", "Box elder", "Paulownia", "Wingnut"],
  },

  // ---------- History & Society ----------
  {
    topic: "History & Society", category: "Monarchs",
    q: "Name a monarch who reigned over England or the UK for more than 50 years",
    criteria: "The answer must be an English or British monarch whose reign over England or the UK lasted more than 50 years.",
    a: [["Elizabeth II", "queen elizabeth", "elizabeth"], ["Victoria", "queen victoria"], ["George III", "king george iii", "george the third"], ["Henry III", "king henry iii", "henry the third"], ["Edward III", "king edward iii", "edward the third"]],
  },
  {
    topic: "History & Society", category: "Civilizations",
    q: "Name an ancient civilization or empire",
    criteria: "The answer must be a historical civilization, empire or culture that flourished before about AD 1500 and no longer exists as a state.",
    a: [["Roman Empire", "rome", "romans", "ancient rome"], ["Ancient Egypt", "egypt", "egyptians"], ["Ancient Greece", "greece", "greeks"], ["Maya", "mayans", "mayan"], ["Aztec", "aztecs"], ["Inca", "incas"], ["Persian Empire", "persia", "achaemenid"], ["Babylon", "babylonians", "babylonia"], ["Assyria", "assyrians"], ["Sumer", "sumerians"], ["Akkad", "akkadian empire"], ["Hittites", "hittite empire"], ["Phoenicia", "phoenicians"], ["Carthage", "carthaginians"], "Mesopotamia", ["Indus Valley", "harappan"], ["Olmec", "olmecs"], ["Zapotec", "zapotecs"], "Teotihuacan", ["Mycenae", "mycenaean"], ["Minoan", "minoans"], ["Etruscan", "etruscans"], ["Han dynasty", "han china"], ["Qin dynasty", "qin"], ["Shang dynasty", "shang"], ["Zhou dynasty", "zhou"], ["Maurya Empire", "mauryan"], ["Gupta Empire", "gupta"], ["Kushan Empire", "kushan"], ["Parthian Empire", "parthia"], ["Sasanian Empire", "sassanid"], ["Aksum", "aksumite empire", "axum"], ["Kush", "kingdom of kush", "nubia"], ["Khmer Empire", "angkor"], ["Byzantine Empire", "byzantium"], ["Macedon", "macedonian empire"], ["Seleucid Empire", "seleucids"], ["Ptolemaic Kingdom", "ptolemaic egypt"], ["Caral", "norte chico"], ["Nabataeans", "nabataea"], "Elam", "Urartu", "Moche", "Nazca", "Chavín", "Wari", "Tiwanaku", ["Toltec", "toltecs"], "Great Zimbabwe", ["Mali Empire", "mali"], ["Ghana Empire"], ["Songhai Empire", "songhai"], ["Mongol Empire", "mongols"], ["Ottoman Empire", "ottomans"], ["Vikings", "norse"], ["Celts", "celtic"], ["Scythians", "scythia"], ["Lydia", "lydians"], ["Mississippian culture", "cahokia"]],
  },
  {
    topic: "History & Society", category: "US presidents",
    q: "Name a US president",
    criteria: "The answer must be a person who has served as President of the United States. A surname alone is accepted.",
    a: [["George Washington", "washington"], ["John Adams", "adams"], ["Thomas Jefferson", "jefferson"], ["James Madison", "madison"], ["James Monroe", "monroe"], "John Quincy Adams", ["Andrew Jackson", "jackson"], ["Martin Van Buren", "van buren"], ["William Henry Harrison", "harrison"], ["John Tyler", "tyler"], ["James K. Polk", "polk", "james polk"], ["Zachary Taylor", "taylor"], ["Millard Fillmore", "fillmore"], ["Franklin Pierce", "pierce"], ["James Buchanan", "buchanan"], ["Abraham Lincoln", "lincoln", "abe lincoln"], ["Andrew Johnson", "johnson"], ["Ulysses S. Grant", "grant", "ulysses grant"], ["Rutherford B. Hayes", "hayes"], ["James A. Garfield", "garfield", "james garfield"], ["Chester A. Arthur", "arthur", "chester arthur"], ["Grover Cleveland", "cleveland"], "Benjamin Harrison", ["William McKinley", "mckinley"], ["Theodore Roosevelt", "teddy roosevelt", "roosevelt"], ["William Howard Taft", "taft"], ["Woodrow Wilson", "wilson"], ["Warren G. Harding", "harding"], ["Calvin Coolidge", "coolidge"], ["Herbert Hoover", "hoover"], ["Franklin D. Roosevelt", "fdr", "franklin roosevelt"], ["Harry S. Truman", "truman", "harry truman"], ["Dwight D. Eisenhower", "eisenhower", "ike"], ["John F. Kennedy", "jfk", "kennedy"], ["Lyndon B. Johnson", "lbj", "lyndon johnson"], ["Richard Nixon", "nixon"], ["Gerald Ford", "ford"], ["Jimmy Carter", "carter"], ["Ronald Reagan", "reagan"], ["George H. W. Bush", "bush", "george bush"], ["Bill Clinton", "clinton"], "George W. Bush", ["Barack Obama", "obama"], ["Donald Trump", "trump"], ["Joe Biden", "biden"]],
  },
  {
    topic: "History & Society", category: "Battles",
    q: "Name a famous battle",
    criteria: "The answer must be a real historical battle, siege or named military engagement. Wars as a whole are not accepted.",
    a: ["Waterloo", "Gettysburg", "Hastings", "Thermopylae", "Stalingrad", ["Normandy", "d-day", "d day"], "Midway", "Somme", "Verdun", "Agincourt", "Marathon", "Trafalgar", "Bunker Hill", "Saratoga", "Yorktown", "Little Bighorn", "Alamo", "Antietam", "Bull Run", "Shiloh", "Vicksburg", "Iwo Jima", "Okinawa", "Guadalcanal", "El Alamein", "Kursk", ["Battle of the Bulge", "bulge"], "Dunkirk", "Battle of Britain", "Pearl Harbor", "Austerlitz", "Leipzig", "Borodino", "Lepanto", "Tours", "Cannae", "Zama", "Actium", "Salamis", "Gaugamela", "Issus", "Hattin", "Bannockburn", "Culloden", "Bosworth", "Crécy", "Poitiers", "Blenheim", "Plassey", "Ypres", "Gallipoli", "Passchendaele", "Tannenberg", "Jutland", "Marne", "Inchon", "Dien Bien Phu", "Manzikert", "Kadesh", "Teutoburg Forest", "Adrianople", "Lexington and Concord", "Plains of Abraham", "Sedan", "Solferino", "Isandlwana", "Rorke's Drift", "Omdurman", "Balaclava", "Tsushima", "Coral Sea", "Leyte Gulf", "Monte Cassino", "Arnhem", "Anzio", "Fredericksburg", "Chancellorsville", "Hue"],
  },
  {
    topic: "History & Society", category: "Olympics",
    q: "Name a sport that has been in the Olympics",
    criteria: "The answer must be a sport or discipline that is or has been on the official Summer or Winter Olympic programme, including discontinued ones.",
    a: [["Athletics", "track and field"], "Swimming", "Gymnastics", "Basketball", ["Football", "soccer"], "Tennis", "Volleyball", "Boxing", "Wrestling", "Judo", "Taekwondo", "Fencing", "Archery", "Rowing", ["Canoeing", "kayaking", "canoe"], "Cycling", "Diving", ["Equestrian", "dressage", "show jumping"], "Golf", "Handball", ["Hockey", "field hockey"], ["Rugby", "rugby sevens"], "Sailing", "Shooting", ["Table tennis", "ping pong"], "Triathlon", "Weightlifting", "Badminton", "Water polo", "Modern pentathlon", "Skateboarding", "Surfing", ["Sport climbing", "climbing"], ["Breaking", "breakdancing"], ["Artistic swimming", "synchronized swimming"], "Trampoline", "BMX", "Beach volleyball", "Baseball", "Softball", "Karate", "Skiing", "Alpine skiing", "Cross-country skiing", "Ski jumping", "Biathlon", ["Bobsleigh", "bobsled"], "Luge", "Skeleton", "Curling", "Ice hockey", "Figure skating", "Speed skating", "Short track", "Snowboarding", "Freestyle skiing", "Nordic combined", "Ski mountaineering", "Tug of war", "Polo", "Lacrosse", "Cricket", "Croquet", "Rackets", "Jeu de paume", "Basque pelota", "Motorboating", "Squash", "Flag football"],
  },

  // ---------- Science & Tech ----------
  {
    topic: "Science & Tech", category: "Elements",
    q: "Name a chemical element named after a person",
    criteria: "The answer must be a chemical element whose name honors a real person, directly or through a mineral or lab named for them.",
    a: ["Einsteinium", "Curium", "Mendelevium", "Nobelium", "Fermium", "Lawrencium", "Rutherfordium", "Seaborgium", "Bohrium", "Meitnerium", "Roentgenium", "Copernicium", "Flerovium", "Oganesson", "Gadolinium", "Samarium"],
  },
  {
    topic: "Science & Tech", category: "Programming",
    q: "Name a programming language",
    criteria: "The answer must be a real general-purpose or domain-specific programming language. Markup languages (HTML) and frameworks are not accepted.",
    a: ["Python", "Java", "JavaScript", "C", "C++", "C#", "Ruby", "Go", "Rust", "Swift", "Kotlin", "PHP", "Perl", "R", "MATLAB", "Scala", "Haskell", "Lisp", "Scheme", "Clojure", "Erlang", "Elixir", "Fortran", "COBOL", "Pascal", "Ada", "BASIC", "Visual Basic", "Lua", "Julia", "Dart", "TypeScript", "SQL", "Assembly", "Prolog", "Smalltalk", "OCaml", "F#", "Objective-C", "Groovy", "Zig", "Nim", "Crystal", "Elm", "Racket", "Tcl", "Bash", "PowerShell", "Delphi", "Simula", "ALGOL", "APL", "Forth", "Logo", "Scratch", "Solidity", "Haxe", "D", "Raku", "Idris", "Agda", "Mojo", "Odin", "Gleam", "Opal", "Emerald", "Eiffel", "Modula-2", "Oberon", "PL/I", "Rexx", "AWK", "Standard ML", "Hack", "CoffeeScript"],
  },
  {
    topic: "Science & Tech", category: "Anatomy",
    q: "Name a bone in the human body",
    criteria: "The answer must be a bone or named group of bones in the adult human skeleton. Common names (kneecap, collarbone) are accepted.",
    a: [["Femur", "thigh bone"], "Tibia", "Fibula", ["Patella", "kneecap"], "Humerus", "Radius", "Ulna", ["Skull", "cranium"], ["Mandible", "jawbone", "jaw"], "Maxilla", ["Clavicle", "collarbone"], ["Scapula", "shoulder blade"], ["Sternum", "breastbone"], ["Rib", "ribs"], ["Vertebra", "vertebrae", "spine"], ["Pelvis", "hip bone"], "Ilium", "Ischium", "Pubis", "Sacrum", ["Coccyx", "tailbone"], ["Carpals", "carpal"], "Scaphoid", "Lunate", "Triquetrum", "Pisiform", "Trapezium", "Trapezoid", "Capitate", "Hamate", ["Metacarpals", "metacarpal"], ["Phalanges", "phalanx"], ["Tarsals", "tarsal"], "Talus", ["Calcaneus", "heel bone"], "Navicular", "Cuboid", "Cuneiform", ["Metatarsals", "metatarsal"], "Hyoid", ["Stapes", "stirrup"], ["Incus", "anvil"], ["Malleus", "hammer"], "Atlas", "Axis", "Frontal bone", "Parietal bone", "Temporal bone", "Occipital bone", "Sphenoid", "Ethmoid", ["Zygomatic", "cheekbone"], "Nasal bone", "Lacrimal bone", "Palatine bone", "Vomer", "Sesamoid"],
  },
  {
    topic: "Science & Tech", category: "Inventors",
    q: "Name a famous inventor",
    criteria: "The answer must be a real person widely credited with inventing a device, machine or process. A surname alone is accepted when it clearly identifies one inventor.",
    a: [["Thomas Edison", "edison"], ["Nikola Tesla", "tesla"], ["Alexander Graham Bell", "graham bell", "bell"], ["Orville Wright", "wright brothers", "wright"], "Wilbur Wright", ["Benjamin Franklin", "franklin"], ["James Watt", "watt"], ["Leonardo da Vinci", "da vinci", "leonardo"], ["Johannes Gutenberg", "gutenberg"], ["Henry Ford", "ford"], ["Tim Berners-Lee", "berners-lee"], ["Guglielmo Marconi", "marconi"], ["Samuel Morse", "morse"], ["Eli Whitney", "whitney"], ["George Westinghouse", "westinghouse"], ["Louis Braille", "braille"], ["Alfred Nobel", "nobel"], ["Karl Benz", "benz"], ["Rudolf Diesel", "diesel"], ["Gottlieb Daimler", "daimler"], ["John Logie Baird", "baird"], ["Philo Farnsworth", "farnsworth"], ["Hedy Lamarr", "lamarr"], ["Grace Hopper", "hopper"], ["Charles Babbage", "babbage"], ["James Dyson", "dyson"], ["Garrett Morgan"], ["Elisha Otis", "otis"], ["Isaac Singer"], ["Elias Howe"], "Archimedes", ["Hero of Alexandria", "heron"], ["Robert Fulton", "fulton"], ["Cyrus McCormick", "mccormick"], ["Charles Goodyear", "goodyear"], ["Joseph Swan"], ["Michael Faraday", "faraday"], ["Alessandro Volta", "volta"], ["Ernő Rubik", "rubik"], ["Willis Carrier"], ["Percy Spencer"], ["Mary Anderson"], ["Josephine Cochrane"], ["Stephanie Kwolek", "kwolek"], ["Dean Kamen", "kamen"], ["Igor Sikorsky", "sikorsky"], ["Frank Whittle", "whittle"], ["Christopher Cockerell", "cockerell"], ["Trevor Baylis"], ["Richard Arkwright", "arkwright"], ["James Hargreaves", "hargreaves"], ["George Stephenson", "stephenson"], ["Humphry Davy", "davy"], ["Cai Lun"], ["Bi Sheng"], ["Al-Jazari"], ["Nicéphore Niépce", "niepce"], ["Louis Daguerre", "daguerre"], ["Nikolaus Otto"], ["King C. Gillette", "gillette"], ["Walter Hunt"], ["John Harrison"], ["Christopher Latham Sholes", "sholes"], ["László Bíró", "biro"], ["Hans Lippershey", "lippershey"], ["Antonie van Leeuwenhoek", "leeuwenhoek"], ["Zhang Heng"], ["Edwin Land"], ["Sarah Boone"], ["Margaret Knight"]],
  },
  {
    topic: "Science & Tech", category: "Units",
    q: "Name a unit of measurement",
    criteria: "The answer must be a real, named unit of measurement (metric, imperial, customary, scientific or traditional). Prefixed forms such as kilometre count.",
    a: [["Metre", "meter"], ["Kilometre", "kilometer"], ["Centimetre", "centimeter"], ["Millimetre", "millimeter"], ["Kilogram", "kilo"], "Gram", "Second", "Minute", "Hour", ["Ampere", "amp"], "Kelvin", "Mole", "Candela", ["Litre", "liter"], "Inch", "Foot", "Yard", "Mile", "Pound", "Ounce", ["Ton", "tonne"], "Gallon", "Pint", "Quart", "Cup", "Teaspoon", "Tablespoon", "Acre", "Hectare", "Newton", "Joule", "Watt", "Volt", "Ohm", "Coulomb", "Farad", "Henry", "Tesla", "Weber", "Pascal", "Hertz", "Becquerel", "Gray", "Sievert", "Lumen", "Lux", "Katal", "Siemens", "Calorie", "Horsepower", "Bar", "Atmosphere", "Knot", "Nautical mile", "Fathom", "Furlong", "League", "Chain", "Rod", "Stone", "Carat", "Grain", "Dram", "Bushel", "Peck", "Decibel", "Byte", "Bit", "Light-year", "Parsec", "Ångström", "Micron", "Barrel", "Cord", "Hand", "Cubit", "BTU", "Erg", "Dyne", "Gauss", "Torr", "Rem", "Curie", "Roentgen", "Degree", "Radian", "Steradian", "Electronvolt", "Dalton", "Hogshead", "Firkin", "Smoot", "Scruple", "Poise", "Mho", "Barn", "Shake", "Jiffy"],
  },
];
