/**
 * AI storybook — journey modal + Supabase Edge Function `clever-service`.
 * Requires: deploy function + OPENAI_API_KEY secret (see supabase/functions/clever-service/README.md).
 */
(function () {
  var CHARACTERS = [
    { id: "unicorn", label: "Unicorn", icon: "\uD83E\uDD84" },
    { id: "dragon", label: "Little dragon", icon: "\uD83D\uDC09" },
    { id: "custom_buddy", label: "Add your own buddy", icon: "\u270F\uFE0F" },
    { id: "dinosaur", label: "Dinosaur", icon: "\uD83E\uDD96" },
    { id: "robot", label: "Robot", icon: "\uD83E\uDD16" },
    { id: "bunny", label: "Bunny", icon: "\uD83D\uDC30" },
    { id: "teddy", label: "Teddy bear", icon: "\uD83E\uDDF8" },
    { id: "cat", label: "Kitty", icon: "\uD83D\uDC31" },
    { id: "dog", label: "Puppy", icon: "\uD83D\uDC36" },
    { id: "fox", label: "Fox", icon: "\uD83E\uDD8A" },
    { id: "penguin", label: "Penguin", icon: "\uD83D\uDC27" },
    { id: "owl", label: "Owl", icon: "\uD83E\uDD89" },
    { id: "octopus", label: "Octopus", icon: "\uD83D\uDC19" },
    { id: "giraffe", label: "Giraffe", icon: "\uD83E\uDD92" },
    { id: "bee", label: "Bumblebee", icon: "\uD83D\uDC1D" },
    { id: "butterfly", label: "Butterfly", icon: "\uD83E\uDD8B" },
    { id: "ladybug", label: "Ladybug", icon: "\uD83D\uDC1E" },
    { id: "frog", label: "Frog", icon: "\uD83D\uDC38" },
    { id: "hedgehog", label: "Hedgehog", icon: "\uD83E\uDD94" },
    { id: "mouse", label: "Little mouse", icon: "\uD83D\uDC2D" },
    { id: "hippo", label: "Hippo", icon: "\uD83E\uDD9B" },
    { id: "flamingo", label: "Flamingo", icon: "\uD83E\uDDA9" },
    { id: "turtle", label: "Turtle", icon: "\uD83D\uDC22" },
    { id: "koala", label: "Koala", icon: "\uD83D\uDC28" },
    { id: "llama", label: "Llama", icon: "\uD83E\uDD99" },
    { id: "raccoon", label: "Raccoon", icon: "\uD83E\uDD9D" },
    { id: "seal", label: "Seal", icon: "\uD83E\uDDAD" },
    { id: "otter", label: "Otter", icon: "\uD83E\uDDA6" },
    { id: "panda", label: "Panda", icon: "\uD83D\uDC3C" },
    { id: "bear", label: "Bear cub", icon: "\uD83D\uDC3B" },
    { id: "polarbear", label: "Polar bear", icon: "\uD83D\uDC3B\u200D\u2744\uFE0F" },
    { id: "lion", label: "Lion cub", icon: "\uD83E\uDD81" },
    { id: "tiger", label: "Tiger cub", icon: "\uD83D\uDC2F" },
    { id: "monkey", label: "Monkey friend", icon: "\uD83D\uDC35" },
    { id: "elephant", label: "Elephant calf", icon: "\uD83D\uDC18" },
    { id: "zebra", label: "Zebra foal", icon: "\uD83E\uDD93" },
    { id: "cow", label: "Cow", icon: "\uD83D\uDC04" },
    { id: "pig", label: "Piglet", icon: "\uD83D\uDC37" },
    { id: "sheep", label: "Lamb", icon: "\uD83D\uDC11" },
    { id: "horse", label: "Pony", icon: "\uD83D\uDC34" },
    { id: "chicken", label: "Chicken", icon: "\uD83D\uDC14" },
    { id: "duck", label: "Duckling", icon: "\uD83E\uDD86" },
    { id: "parrot", label: "Parrot", icon: "\uD83E\uDD9C" },
    { id: "deer", label: "Deer fawn", icon: "\uD83E\uDD8C" },
    { id: "dolphin", label: "Dolphin", icon: "\uD83D\uDC33" },
    { id: "whale", label: "Whale", icon: "\uD83D\uDC0B" },
    { id: "crab", label: "Crab", icon: "\uD83E\uDD80" },
    { id: "snail", label: "Snail", icon: "\uD83D\uDC0C" },
    { id: "caterpillar", label: "Caterpillar", icon: "\uD83D\uDC1B" },
    { id: "lightningbug", label: "Glow-bug buddy", icon: "\u2728" },
    { id: "fairy", label: "Tiny fairy", icon: "\uD83E\uDDDA" },
    { id: "alien", label: "Squishy alien", icon: "\uD83D\uDC7D" },
    { id: "ghost", label: "Friendly ghost", icon: "\uD83D\uDC7B" },
    { id: "snowbuddy", label: "Snow buddy", icon: "\u26C4" },
    { id: "mermaidbuddy", label: "Merfriend", icon: "\uD83E\uDDDC" },
    { id: "nobuddy", label: "No buddy", icon: "\uD83D\uDC64" },
  ];

  /** Must match clever-service `BOOK_COLOR_KEYS` / `coerceBookColor`. */
  var BOOK_COLOR_OPTIONS = [
    { id: "", label: "Auto", swatch: null },
    { id: "pink", label: "Pink", swatch: "#ec4899" },
    { id: "blue", label: "Blue", swatch: "#2563eb" },
    { id: "green", label: "Green", swatch: "#16a34a" },
    { id: "purple", label: "Purple", swatch: "#9333ea" },
    { id: "orange", label: "Orange", swatch: "#ea580c" },
    { id: "teal", label: "Teal", swatch: "#0d9488" },
    { id: "red", label: "Red", swatch: "#dc2626" },
    { id: "yellow", label: "Yellow", swatch: "#ca8a04" },
    { id: "lilac", label: "Lilac", swatch: "#a78bfa" },
    { id: "mint", label: "Mint", swatch: "#34d399" },
    { id: "coral", label: "Coral", swatch: "#fb7185" },
    { id: "navy", label: "Navy", swatch: "#1e3a8a" },
  ];

  /** Max characters for "What happens?" — keep in sync with clever-service `STORYBOOK_PLOT_HINT_MAX`. */
  var PLOT_INPUT_MAX = 6000;

  /**
   * OpenAI TTS voice for story read-aloud. If **empty**, we pick **ballad** (boy-leaning) or **sage**
   * (girl-leaning) from the book title and hero name — see `firstNameForReadAloud`.
   * Set to any clever-service voice id to lock a voice (e.g. "coral").
   */
  var STORYBOOK_TTS_VOICE = "";

  /**
   * Common first names (lowercase → 1). Hero/title tokens are matched here for read-aloud voice.
   * Unisex → we use **sage**. Missing names omit `ttsVoice` so the server default applies.
   */
  var TTS_BOY_NAMES = {
    adam: 1, adrian: 1, aiden: 1, aj: 1, albert: 1, alexander: 1, alfie: 1, andrew: 1,
    angus: 1, archie: 1, arlo: 1, arthur: 1, austin: 1, axel: 1, bear: 1, beau: 1, ben: 1, benjamin: 1,
    billy: 1, blake: 1, bodhi: 1, bobby: 1, bradley: 1, brody: 1, bryan: 1, bryce: 1, buster: 1,
    caden: 1, caleb: 1, callum: 1, calvin: 1, cameron: 1, carter: 1, charles: 1, chase: 1, chester: 1, christian: 1, christopher: 1, clark: 1, colin: 1, colton: 1, connor: 1,
    cooper: 1, cyrus: 1, damian: 1, daniel: 1, danny: 1, darren: 1, dave: 1, david: 1, dean: 1,
    declan: 1, dexter: 1, dominic: 1, dougie: 1, douglas: 1, drake: 1, dylan: 1, easton: 1,
    eddie: 1, edgar: 1, edward: 1, elliot: 1, elliott: 1, eli: 1, elias: 1, emil: 1, eric: 1, ethan: 1,
    evan: 1, ewan: 1, ezra: 1, felix: 1, finn: 1, fletcher: 1, flynn: 1, ford: 1, frank: 1,
    frankie: 1, freddie: 1, frederick: 1, gabriel: 1, garrett: 1, gary: 1, gavin: 1, gareth: 1, george: 1,
    gideon: 1, grayson: 1, greg: 1, greyson: 1, griffin: 1, guy: 1, harold: 1, harrison: 1,
    harry: 1, harvey: 1, henry: 1, hudson: 1, hugh: 1, hugo: 1, hunter: 1, ian: 1, igor: 1, isaac: 1,
    isaiah: 1, ivan: 1, jack: 1, jackson: 1, jacob: 1, jake: 1, james: 1, jared: 1, jarrett: 1,
    jason: 1, jasper: 1, jax: 1, jaxson: 1, jay: 1, jayden: 1, jed: 1, jeff: 1, jeremiah: 1, jesse: 1,
    joey: 1, john: 1, johnny: 1, jonah: 1, jonathan: 1, jonny: 1, joseph: 1, josh: 1, joshua: 1,
    josiah: 1, jude: 1, judah: 1, julian: 1, julius: 1, junior: 1, justin: 1, kai: 1, kane: 1, karl: 1,
    kayden: 1, keenan: 1, keith: 1, ken: 1, kenneth: 1, kevin: 1, kian: 1, kieran: 1, kit: 1, kobe: 1,
    kyle: 1, kyrie: 1, lance: 1, lawrence: 1, lee: 1, legend: 1, lennox: 1, leo: 1, leon: 1, leonard: 1,
    levi: 1, liam: 1, lincoln: 1, logan: 1, louie: 1, louis: 1, luca: 1, lucas: 1, lucian: 1, lucius: 1,
    luis: 1, luke: 1, magnus: 1, malachi: 1, marcus: 1, mario: 1, mark: 1, marshall: 1, martin: 1, marvin: 1,
    mason: 1, mateo: 1, matt: 1, matthew: 1, maurice: 1, max: 1, maximilian: 1, micah: 1, michael: 1,
    mick: 1, miguel: 1, milo: 1, mitchell: 1, mohamed: 1, muhammad: 1, mohammed: 1, monty: 1, myles: 1,
    nate: 1, nathan: 1, nathaniel: 1, neil: 1, nelson: 1, nico: 1, noah: 1, nolan: 1, norman: 1,
    oakley: 1, odin: 1, oliver: 1, ollie: 1, orlando: 1, oscar: 1, otto: 1, owen: 1, parker: 1, patrick: 1,
    paul: 1, pedro: 1, peter: 1, phil: 1, philip: 1, pierce: 1, preston: 1, quentin: 1, rafael: 1,
    ralph: 1, randall: 1, randy: 1, raul: 1, ray: 1, raymond: 1, reggie: 1, remy: 1, rex: 1, reuben: 1,
    rhys: 1, richard: 1, ricky: 1, rob: 1, robbie: 1, robert: 1, rocco: 1, rocky: 1,
    rodney: 1, roger: 1, roman: 1, ronan: 1, ronnie: 1, rory: 1, ross: 1, roy: 1, ruben: 1,
    rudy: 1, russell: 1, rusty: 1, ryan: 1, ryder: 1, samson: 1, samuel: 1, santino: 1,
    sascha: 1, sawyer: 1, scott: 1, sean: 1, sebastian: 1, sergio: 1, seth: 1, shaun: 1, shawn: 1, silas: 1,
    simon: 1, sonny: 1, stanley: 1, stefan: 1, stephen: 1, steve: 1, steven: 1, sullivan: 1, teddy: 1,
    terry: 1, theo: 1, theodore: 1, thomas: 1, tim: 1, timothy: 1, tobias: 1, toby: 1, todd: 1, tommy: 1,
    tony: 1, travis: 1, trent: 1, trevor: 1, tristan: 1, troy: 1, tucker: 1, tyler: 1, tyson: 1, vance: 1,
    vaughn: 1, vernon: 1, victor: 1, vincent: 1, vinnie: 1, walter: 1, warren: 1, wayne: 1, wesley: 1,
    will: 1, william: 1, willie: 1, wilson: 1, xander: 1, xavier: 1, zach: 1, zachary: 1, zain: 1, zander: 1,
    zane: 1, zeke: 1,
  };

  var TTS_GIRL_NAMES = {
    abby: 1, abigail: 1, ada: 1, addison: 1, adelaide: 1, adele: 1, adeline: 1, agnes: 1, aileen: 1,
    aisha: 1, alana: 1, alexa: 1, alexandra: 1, alexis: 1, alice: 1, alicia: 1, alina: 1, alison: 1, alyssa: 1,
    amanda: 1, amara: 1, amber: 1, amelia: 1, amy: 1, ana: 1, anastasia: 1, andrea: 1, angel: 1, angela: 1,
    angelica: 1, anna: 1, annabelle: 1, annabel: 1, anne: 1, annie: 1, arabella: 1, aria: 1, ariana: 1,
    arianna: 1, arwen: 1, ashley: 1, astrid: 1, athena: 1, audrey: 1, aurora: 1, autumn: 1, ava: 1,
    ayla: 1, barbara: 1, beatrice: 1, beatrix: 1, bella: 1, belle: 1, beth: 1, betsy: 1, betty: 1,
    bianca: 1, bonnie: 1, braelyn: 1, brenda: 1, brianna: 1, bridget: 1, brooke: 1, brooklyn: 1, callie: 1,
    camilla: 1, camille: 1, candy: 1, carly: 1, carmen: 1, caroline: 1, carrie: 1, cassandra: 1,
    cassidy: 1, cassie: 1, catherine: 1, cecilia: 1, celeste: 1, charlotte: 1, chloe: 1, christina: 1,
    claire: 1, clara: 1, clarissa: 1, clementine: 1, colleen: 1, connie: 1, cora: 1, courtney: 1, crystal: 1,
    daisy: 1, dana: 1, danica: 1, danielle: 1, darla: 1, darcy: 1, dawn: 1, deb: 1, debra: 1,
    delia: 1, delilah: 1, destiny: 1, diana: 1, dolly: 1, dolores: 1, donna: 1, dora: 1, doris: 1, dorothy: 1,
    eden: 1, edith: 1, edna: 1, eileen: 1, elaine: 1, eleanor: 1, elena: 1, eliana: 1, elise: 1, eliza: 1,
    elizabeth: 1, ella: 1, elle: 1, ellen: 1, ellie: 1, elsie: 1, eloise: 1, ember: 1, emilia: 1,
    emily: 1, emma: 1, erica: 1, erika: 1, erin: 1, esther: 1, etta: 1, eva: 1, eve: 1, evelyn: 1, everly: 1,
    faith: 1, fatima: 1, faye: 1, felicity: 1, fenella: 1, fiona: 1, flora: 1, florence: 1, frances: 1,
    francesca: 1, freya: 1, gabriella: 1, gabrielle: 1, gemma: 1, georgia: 1, georgina: 1, geraldine: 1,
    gianna: 1, gillian: 1, ginny: 1, giselle: 1, grace: 1, gracie: 1, greta: 1, gwen: 1, gwendolyn: 1, hadley: 1,
    hailey: 1, haley: 1, hana: 1, hannah: 1, harlow: 1, harper: 1, harriet: 1, hattie: 1, hazel: 1, heather: 1,
    heidi: 1, helen: 1, holly: 1, hope: 1, imogen: 1, ines: 1, inez: 1, ingrid: 1, irene: 1, iris: 1, isabel: 1,
    isabella: 1, isla: 1, ivy: 1, izzy: 1, jacqueline: 1, jade: 1, jane: 1, janet: 1, janice: 1,
    jasmine: 1, jean: 1, jeanette: 1, jeannie: 1, jenna: 1, jennifer: 1, jess: 1, jessica: 1, jill: 1, jillian: 1,
    joan: 1, joanna: 1, jocelyn: 1, jodie: 1, johanna: 1, josephine: 1, joy: 1, joyce: 1, judith: 1, julia: 1,
    julianna: 1, julie: 1, juliet: 1, june: 1, junko: 1, kali: 1, karen: 1, kate: 1, katelyn: 1, katherine: 1,
    kathleen: 1, kathryn: 1, katie: 1, kayla: 1, keira: 1, kelly: 1, kendra: 1, kerri: 1, kiara: 1, kim: 1,
    kimberly: 1, kira: 1, kirsten: 1, kitty: 1, kylie: 1, lainey: 1, lana: 1, lara: 1, laura: 1, lauren: 1,
    layla: 1, leah: 1, leela: 1, leia: 1, lena: 1, leona: 1, lexie: 1, lia: 1, lila: 1, lilah: 1,
    lillian: 1, lily: 1, lina: 1, linda: 1, lindsay: 1, lisa: 1, liv: 1, lola: 1, lottie: 1, louisa: 1, louise: 1,
    lucia: 1, lucille: 1, lucy: 1, luna: 1, lydia: 1, lyla: 1, lyra: 1, mabel: 1, madeleine: 1, mae: 1, maeve: 1,
    maggie: 1, magnolia: 1, mandy: 1, mara: 1, marcie: 1, margaret: 1, margot: 1, maria: 1, marian: 1,
    marie: 1, marilyn: 1, marina: 1, marion: 1, marissa: 1, martha: 1, mary: 1, maryam: 1, matilda: 1, maureen: 1,
    maxine: 1, may: 1, maya: 1, megan: 1, melanie: 1, melissa: 1, mia: 1, michelle: 1, millie: 1, minnie: 1,
    miranda: 1, molly: 1, monica: 1, muriel: 1, myra: 1, nadine: 1, nancy: 1, naomi: 1, natalie: 1,
    natasha: 1, nell: 1, nellie: 1, nia: 1, nicole: 1, nikki: 1, nina: 1, noelle: 1, nora: 1, norah: 1, nova: 1,
    octavia: 1, olive: 1, olivia: 1, opal: 1, ophelia: 1, paige: 1, pam: 1, pamela: 1, patricia: 1,
    paula: 1, pearl: 1, peggy: 1, penny: 1, pepper: 1, phoebe: 1, piper: 1, pippa: 1, polly: 1, poppy: 1, priya: 1,
    queenie: 1, rachel: 1, raina: 1, rebecca: 1, regina: 1, renee: 1, rhiannon: 1, rita: 1,
    roberta: 1, romy: 1, ronda: 1, rosa: 1, rose: 1, rosemary: 1, rosie: 1,
    ruby: 1, ruth: 1, rylee: 1, sadie: 1, sally: 1, samantha: 1, sandra: 1, sara: 1, sarah: 1, savannah: 1,
    scarlett: 1, selena: 1, serena: 1, shannon: 1, sharon: 1, sheila: 1, shelby: 1, shelly: 1, shirley: 1,
    sierra: 1, sienna: 1, silvia: 1, skye: 1, sophia: 1, sophie: 1, stacey: 1,
    stacy: 1, stella: 1, summer: 1, susan: 1, susie: 1, sutton: 1, sydney: 1, sylvia: 1, tabitha: 1, tamara: 1,
    tammy: 1, tanya: 1, tara: 1, teresa: 1, tess: 1, tessa: 1, thea: 1, theresa: 1, tiffany: 1, tilly: 1,
    tina: 1, tracy: 1, trinity: 1, trudy: 1, valentina: 1, valerie: 1, vanessa: 1, vera: 1, veronica: 1,
    vicki: 1, victoria: 1, violet: 1, virginia: 1, vivian: 1, vivienne: 1, whitney: 1, willa: 1, willow: 1,
    winifred: 1, winnie: 1, winter: 1, xara: 1, yasmin: 1, yvette: 1, zara: 1, zelda: 1, zoe: 1, zola: 1, zoey: 1,
  };

  /** Names often used for any gender — read-aloud uses **sage**. */
  var TTS_UNISEX_NAMES = {
    alex: 1, avery: 1, bailey: 1, blair: 1, casey: 1, charlie: 1, dakota: 1, devon: 1, drew: 1, ellis: 1,
    emerson: 1, finley: 1, francis: 1, gray: 1, harley: 1, jaden: 1, jamie: 1, jordan: 1, kendall: 1,
    kennedy: 1, kit: 1, lane: 1, lee: 1, leslie: 1, logan: 1, max: 1, morgan: 1, noel: 1, paris: 1,
    pat: 1, peyton: 1, phoenix: 1, quinn: 1, reese: 1, remy: 1, riley: 1, river: 1, robin: 1, rowan: 1, ryan: 1,
    sam: 1, skylar: 1, skyler: 1, stevie: 1, taylor: 1, terry: 1, val: 1,
  };

  var PLACES = [
    { id: "beach", label: "Beach", icon: "\uD83C\uDFD6" },
    { id: "woods", label: "Woods", icon: "\uD83C\uDF32" },
    { id: "custom_place", label: "Add your own scene", icon: "\uD83D\uDDFA" },
    { id: "castle", label: "Castle", icon: "\uD83C\uDFF0" },
    { id: "garden", label: "Garden", icon: "\uD83C\uDF37" },
    { id: "space", label: "Space", icon: "\uD83D\uDE80" },
    { id: "sea", label: "Open sea", icon: "\uD83C\uDF0A" },
    { id: "pirateship", label: "Pirate ship", icon: "\uD83D\uDEA2" },
    { id: "mountain", label: "Mountains", icon: "\u26F0" },
    { id: "zoo", label: "Zoo", icon: "\uD83E\uDD81" },
    { id: "farm", label: "Farm", icon: "\uD83D\uDC04" },
    { id: "circus", label: "Circus", icon: "\uD83C\uDFAA" },
    { id: "city", label: "Toy town", icon: "\uD83C\uDFD7" },
    { id: "train", label: "Train ride", icon: "\uD83D\uDE82" },
    { id: "lake", label: "Lake", icon: "\uD83D\uDEF6" },
    { id: "snow", label: "Snowy land", icon: "\u2744" },
    { id: "desert", label: "Desert", icon: "\uD83C\uDFDC" },
    { id: "stadium", label: "Football stadium", icon: "\u26BD" },
    { id: "museum", label: "Museum", icon: "\uD83C\uDFDB" },
    { id: "island", label: "Tropical island", icon: "\uD83C\uDFDD" },
    { id: "cave", label: "Secret cave", icon: "\uD83E\uDEA8" },
    { id: "undersea", label: "Under the sea", icon: "\uD83D\uDC20" },
    { id: "jungle", label: "Jungle", icon: "\uD83C\uDF34" },
    { id: "school", label: "School day", icon: "\uD83C\uDFEB" },
    { id: "playground", label: "Playground", icon: "\uD83C\uDFDE\uFE0F" },
    { id: "bedroom", label: "Cozy bedroom", icon: "\uD83D\uDECF" },
    { id: "treehouse", label: "Tree house", icon: "\uD83C\uDF33" },
    { id: "library", label: "Library", icon: "\uD83D\uDCDA" },
    { id: "campsite", label: "Camping", icon: "\u26FA" },
    { id: "swimmingpool", label: "Swimming pool", icon: "\uD83C\uDFCA" },
    { id: "icerink", label: "Ice skating", icon: "\u26F8" },
    { id: "airport", label: "Airport", icon: "\u2708" },
    { id: "fairground", label: "Fairground", icon: "\uD83C\uDFA1" },
    { id: "village", label: "Village", icon: "\uD83C\uDFD8" },
    { id: "bakery", label: "Bakery", icon: "\uD83C\uDF6E" },
    { id: "greenhouse", label: "Greenhouse", icon: "\uD83E\uDEB4" },
    { id: "savannah", label: "Savannah sun", icon: "\uD83C\uDF05" },
    { id: "volcano", label: "Quiet volcano hills", icon: "\uD83C\uDF0B" },
    { id: "meadow", label: "Wildflower meadow", icon: "\uD83C\uDF3C" },
    { id: "petshop", label: "Pet nook", icon: "\uD83D\uDC3E" },
    { id: "workshop", label: "Inventors workshop", icon: "\uD83D\uDD27" },
  ];

  var STEP_HEADINGS = [
    "Let’s make your book",
    "Who’s the hero?",
    "Pick a buddy",
    "Where & what happens",
  ];

  var STEP_PROGRESS_LABELS = ["Hello", "You", "Friend", "Story"];

  /** Short lines read aloud per wizard step (pre-readers). */
  var STEP_GUIDE_TEXT = [
    "Welcome. We will ask who you are, who your friend is, then where the story happens and what happens. Press Let’s go when you are ready.",
    "Who is the hero? This is your name in the story. You can type or tap Speak. You can add photos and pick a book title and colours.",
    "Pick a buddy for your story, tap Add your own buddy to describe anyone you like, or pick no buddy for people only.",
    "Pick where it happens using the scenes you see, tap Add your own scene if you like, then write what happens below. One sentence is enough — you can tap Speak or try a starter.",
  ];

  var PLOT_STARTERS = [
    "We found a magic door…",
    "My friend got lost and we helped…",
    "We built a secret clubhouse…",
    "Something glowed under my bed…",
    "We followed a trail of sparkles…",
  ];

  var landing = document.getElementById("sbLanding");
  var modal = document.getElementById("sbModal");
  var book = document.getElementById("sbBook");
  var bookSpreadEl = document.getElementById("sbBookSpread");
  var busy = document.getElementById("sbBusy");
  var appEl = document.getElementById("app");
  var nameInput = document.getElementById("sbName");
  var bookTitleInput = document.getElementById("sbBookTitle");
  var authorInput = document.getElementById("sbAuthor");
  var plotInput = document.getElementById("sbPlot");
  var charRow = document.getElementById("sbCharacters");
  var placeRow = document.getElementById("sbPlaces");
  var buddyCustomWrap = document.getElementById("sbBuddyCustomWrap");
  var buddyCustomInput = document.getElementById("sbBuddyCustom");
  var placeCustomWrap = document.getElementById("sbPlaceCustomWrap");
  var placeCustomInput = document.getElementById("sbPlaceCustom");
  var bookColorsWrap = document.getElementById("sbBookColorsWrap");
  var bookColorsQuick = document.getElementById("sbBookColorsQuick");
  var bookColorsGrid = document.getElementById("sbBookColorsGrid");
  var bookColorsExtra = document.getElementById("sbBookColorsExtra");
  var bookColorToggle = document.getElementById("sbBookColorToggle");
  var errEl = document.getElementById("sbError");
  var modalErr = document.getElementById("sbModalError");
  var progressEl = document.getElementById("sbProgress");
  var stepKicker = document.getElementById("sbStepKicker");
  var stepHeading = document.getElementById("sbStepHeading");
  var readStepBtn = document.getElementById("sbReadStepBtn");
  var btnStart = document.getElementById("sbStartJourney");
  var btnGen = document.getElementById("sbGenerate");
  var heroPhotoInput = document.getElementById("sbHeroPhoto");
  var heroPhotoPickBtn = document.getElementById("sbHeroPhotoPick");
  var heroPhotoThumbsWrap = document.getElementById("sbHeroPhotoThumbsWrap");
  var heroPhotoThumbsList = document.getElementById("sbHeroPhotoThumbs");
  var heroPhotoErr = document.getElementById("sbHeroPhotoErr");
  var heroPhotoRemove = document.getElementById("sbHeroPhotoRemove");
  var heroPhotoNameOverlay = document.getElementById("sbHeroPhotoNameOverlay");
  var heroPhotoNameThumb = document.getElementById("sbHeroPhotoNameThumb");
  var heroPhotoNameLead = document.getElementById("sbHeroPhotoNameLead");
  var heroPhotoNameInput = document.getElementById("sbHeroPhotoNameInput");
  var heroPhotoNameErr = document.getElementById("sbHeroPhotoNameErrInline");
  var btnHeroPhotoNameOk = document.getElementById("sbHeroPhotoNameOk");
  var btnHeroPhotoNameVoice = document.getElementById("sbHeroPhotoNameVoice");
  var btnHeroPhotoNameMe = document.getElementById("sbHeroPhotoNameMe");
  var heroPhotoNameVoiceHint = document.getElementById("sbHeroPhotoNameVoiceHint");
  /** @type {number[]} — indices in heroPhotoItems still to name after an upload */
  var heroPhotoPromptIndices = [];
  var heroPhotoPromptAt = 0;
  var heroRefDatalist = document.getElementById("sbHeroRefWhoDatalist");
  /** @type {{ dataUrl: string, who: string }[]} */
  var heroPhotoItems = [];
  var HERO_PHOTO_MAX_COUNT = 3;
  /** Keep under clever-service `MAX_HERO_REFERENCE_BYTES` per image after base64 (~1.2MB raw). */
  var HERO_PHOTO_MAX_FILE_BYTES = Math.floor(1.25 * 1024 * 1024);
  var readerHeading = document.getElementById("sbBookHeading");
  var spreadText = document.getElementById("sbSpreadText");
  var spreadTextClip = document.getElementById("sbSpreadTextClip");
  var spreadTextActions = document.getElementById("sbSpreadTextActions");
  var btnReadToMe = document.getElementById("sbReadToMe");
  var spreadArt = document.getElementById("sbSpreadArt");

  var currentAudio = null;
  var stepGuideAudio = null;
  var stepGuidePlaying = false;

  function refreshReadStepBtn() {
    if (!readStepBtn) return;
    if (stepGuidePlaying) {
      readStepBtn.textContent = "Stop";
      readStepBtn.setAttribute("aria-label", "Stop reading this step");
    } else {
      readStepBtn.innerHTML =
        '<span aria-hidden="true">\uD83D\uDD0A</span> Read this to me';
      readStepBtn.setAttribute(
        "aria-label",
        "Read this step out loud",
      );
    }
  }

  function stopStepGuideAudio() {
    if (stepGuideAudio) {
      try {
        stepGuideAudio.pause();
        stepGuideAudio.src = "";
      } catch (eSg) {}
      stepGuideAudio = null;
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (eSy) {}
    }
    stepGuidePlaying = false;
    refreshReadStepBtn();
  }

  function speakStepGuideFallback(text) {
    if (!window.speechSynthesis) return;
    stepGuidePlaying = true;
    refreshReadStepBtn();
    var u = new SpeechSynthesisUtterance(text);
    if (typeof KidsCore !== "undefined" && KidsCore.applyKidFriendlySpeech) {
      KidsCore.applyKidFriendlySpeech(u, "en-GB");
    } else {
      u.lang = "en-GB";
      u.rate = 1.08;
      u.pitch = 1.18;
    }
    u.onend = function () {
      stepGuidePlaying = false;
      refreshReadStepBtn();
    };
    u.onerror = function () {
      stepGuidePlaying = false;
      refreshReadStepBtn();
    };
    window.speechSynthesis.speak(u);
  }

  function toggleStepGuide() {
    stopSpeech();
    if (stepGuidePlaying) {
      stopStepGuideAudio();
      return;
    }
    stopReading();
    stopStepGuideAudio();
    var text = STEP_GUIDE_TEXT[journeyStep];
    if (!text) return;
    var ttsUrl = cleverServiceTtsUrl(text);
    if (ttsUrl) {
      stepGuideAudio = new Audio(ttsUrl);
      stepGuidePlaying = true;
      refreshReadStepBtn();
      stepGuideAudio.onended = function () {
        stepGuidePlaying = false;
        refreshReadStepBtn();
      };
      stepGuideAudio.onerror = function () {
        stopStepGuideAudio();
        speakStepGuideFallback(text);
      };
      var gp = stepGuideAudio.play();
      if (gp !== undefined) {
        gp.catch(function () {
          stopStepGuideAudio();
          speakStepGuideFallback(text);
        });
      }
    } else {
      speakStepGuideFallback(text);
    }
  }

  function readWordOutLoud(word, element) {
    stopStepGuideAudio();
    if (currentAudio) {
      stopReading();
    }

    var fUrl = functionUrl();
    if (!fUrl) return;
    
    // Highlight the word being read
    if (element) {
      element.classList.add("sb-word-reading");
    }
    
    var audioUrl = cleverServiceTtsUrl(word);
    if (!audioUrl) return;
    currentAudio = new Audio(audioUrl);
    
    var playPromise = currentAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(function(e) {
        console.error("Word audio playback failed:", e);
        if (element) {
          element.classList.remove("sb-word-reading");
        }
        stopReading();
      });
    }
    
    currentAudio.onended = function() {
      if (element) {
        element.classList.remove("sb-word-reading");
      }
      stopReading();
    };
    currentAudio.onerror = function() {
      if (element) {
        element.classList.remove("sb-word-reading");
      }
      stopReading();
    };
  }

  function stopReading() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
      currentAudio = null;
    }
    if (btnReadToMe) {
      btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">🔊</span>';
      btnReadToMe.disabled = false;
    }
  }

  if (btnReadToMe) {
    btnReadToMe.addEventListener("click", function() {
      if (currentAudio) {
        stopReading();
        return;
      }
      stopStepGuideAudio();
      var n = numSpreads();
      if (n < 1 || spreadIndex * 2 >= story.pages.length) return;
      var leftP = story.pages[spreadIndex * 2];
      if (!leftP || !leftP.text) return;
      
      var fUrl = functionUrl();
      if (!fUrl) return;
      
      btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">⏳</span>';
      btnReadToMe.disabled = true;
      
      var audioUrl = cleverServiceTtsUrl(leftP.text);
      if (!audioUrl) {
        stopReading();
        return;
      }
      currentAudio = new Audio(audioUrl);
      
      // On iOS, play() must be called synchronously in the click handler
      var playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          if (!currentAudio) return;
          btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">⏹️</span>';
          btnReadToMe.disabled = false;
        }).catch(function(e) {
          console.error("Audio playback failed:", e);
          stopReading();
        });
      } else {
        btnReadToMe.innerHTML = '<span aria-hidden="true" style="margin: 0;">⏹️</span>';
        btnReadToMe.disabled = false;
      }
      
      currentAudio.onended = stopReading;
      currentAudio.onerror = stopReading;
    });
  }
  var spreadArtImg = document.getElementById("sbSpreadArtImg");
  var spreadArtNum = document.getElementById("sbSpreadArtNum");
  var spreadInnerEl = document.getElementById("sbFlipSpreadInner");
  var flipSpreadEl = document.getElementById("sbFlipSpread");
  var spreadArtBg = document.getElementById("sbSpreadArtBg");
  var spreadArtBase = document.getElementById("sbSpreadArtBase");
  var spreadArtCover = document.getElementById("sbSpreadArtCover");
  var spreadArtFlyleaf = document.getElementById("sbSpreadArtFlyleaf");
  /** Incoming spread: full duplex under the peel (#sbSpreadArtCover inside .sb-flip-spread__art-base). */
  /** Outgoing duplex on #sbSpreadArtPeel rotates away above it. */
  var spreadArtPeelShell = document.getElementById("sbSpreadArtPeel");
  var spreadArtPeelImg = document.getElementById("sbSpreadArtPeelImg");
  var spreadPeelBackText = document.getElementById("sbSpreadPeelBackText");
  var spreadPeelFrontText = document.getElementById("sbSpreadPeelFrontText");
  var readerStack = document.getElementById("sbReaderStack");
  var readerPages = document.getElementById("sbReaderPages");
  var flipLeftShell = document.getElementById("sbFlipLeftShell");
  var flipRightShell = document.getElementById("sbFlipRightShell");
  var spreadPageNumEl = document.getElementById("sbSpreadPageNum");
  var bookSpreadLayoutFieldset = document.getElementById("sbBookSpreadLayout");
  var illustrationStyleFieldset = document.getElementById("sbIllustrationStyles");
  var storyTextModeFieldset = document.getElementById("sbStoryTextMode");
  var storyLengthFieldset = document.getElementById("sbStoryLength");
  var K_READER_ART_LAYOUT = "sbReaderArtLayout";
  var K_ILLUSTRATION_STYLE = "sbIllustrationStyle";
  var K_STORY_TEXT_MODE = "sbStoryTextMode";
  var K_STORY_LENGTH = "sbStoryLength";

  function getReaderArtLayout() {
    try {
      var v = localStorage.getItem(K_READER_ART_LAYOUT);
      if (v === "facing" || v === "duplex") return v;
    } catch (eReadLayout) {}
    return "duplex";
  }

  /**
   * Spread layout for the **open** book. Legacy books default to duplex (full two-page art).
   * @returns {'duplex' | 'facing'}
   */
  function getEffectiveReaderArtLayout() {
    if (story && story.readerArtLayout === "facing") return "facing";
    if (story && story.readerArtLayout === "duplex") return "duplex";
    return "duplex";
  }

  function setReaderArtLayout(mode) {
    try {
      localStorage.setItem(K_READER_ART_LAYOUT, mode === "facing" ? "facing" : "duplex");
    } catch (eSetLayout) {}
  }

  function syncBookSpreadLayoutRadios() {
    if (!bookSpreadLayoutFieldset) return;
    var m = getReaderArtLayout();
    var inp = bookSpreadLayoutFieldset.querySelector(
      'input[name="sbBookSpreadLayout"][value="' + m + '"]'
    );
    if (inp) inp.checked = true;
  }

  /** @returns {'duplex' | 'facing'} */
  function readBookSpreadLayoutFromWizard() {
    if (!bookSpreadLayoutFieldset) return getReaderArtLayout();
    var c = bookSpreadLayoutFieldset.querySelector(
      'input[name="sbBookSpreadLayout"]:checked'
    );
    if (!c) return getReaderArtLayout();
    return String(c.value) === "facing" ? "facing" : "duplex";
  }

  function getStoryTextMode() {
    try {
      var v = localStorage.getItem(K_STORY_TEXT_MODE);
      if (v === "prose" || v === "rhyme") return v;
    } catch (eStoryMode) {}
    return "rhyme";
  }

  function setStoryTextMode(mode) {
    try {
      localStorage.setItem(K_STORY_TEXT_MODE, mode === "prose" ? "prose" : "rhyme");
    } catch (eSetStoryMode) {}
  }

  function syncStoryTextModeRadios() {
    if (!storyTextModeFieldset) return;
    var m = getStoryTextMode();
    var inp = storyTextModeFieldset.querySelector(
      'input[name="sbStoryTextMode"][value="' + m + '"]'
    );
    if (inp) inp.checked = true;
  }

  /** @returns {'prose' | 'rhyme'} */
  function readStoryTextModeFromWizard() {
    if (!storyTextModeFieldset) return getStoryTextMode();
    var c = storyTextModeFieldset.querySelector(
      'input[name="sbStoryTextMode"]:checked'
    );
    if (!c) return getStoryTextMode();
    return String(c.value) === "prose" ? "prose" : "rhyme";
  }

  /** Shelf / legacy: infer mode when not stored. */
  function storyTextModeFromShelfItem(item, layout) {
    var lay = layout === "facing" ? "facing" : "duplex";
    if (item && (item.storyTextMode === "prose" || item.storyTextMode === "rhyme")) {
      return item.storyTextMode;
    }
    return lay === "facing" ? "prose" : "rhyme";
  }

  function coerceStoryLengthKey(v) {
    var s = String(v || "").trim().toLowerCase();
    if (s === "short" || s === "medium" || s === "long") return s;
    return "medium";
  }

  function getStoryLength() {
    try {
      var v = localStorage.getItem(K_STORY_LENGTH);
      return coerceStoryLengthKey(v);
    } catch (eLen) {}
    return "medium";
  }

  function setStoryLength(mode) {
    try {
      localStorage.setItem(K_STORY_LENGTH, coerceStoryLengthKey(mode));
    } catch (eSetLen) {}
  }

  function syncStoryLengthRadios() {
    if (!storyLengthFieldset) return;
    var m = getStoryLength();
    var inp = storyLengthFieldset.querySelector(
      'input[name="sbStoryLength"][value="' + m + '"]'
    );
    if (inp) inp.checked = true;
  }

  /** @returns {'short' | 'medium' | 'long'} */
  function readStoryLengthFromWizard() {
    if (!storyLengthFieldset) return getStoryLength();
    var c = storyLengthFieldset.querySelector(
      'input[name="sbStoryLength"]:checked'
    );
    if (!c) return getStoryLength();
    return coerceStoryLengthKey(c.value);
  }

  function storyLengthFromShelfItem(item) {
    if (
      item &&
      (item.storyLength === "short" ||
        item.storyLength === "medium" ||
        item.storyLength === "long")
    ) {
      return item.storyLength;
    }
    return "medium";
  }

  var ILLUSTRATION_STYLE_KEYS = {
    clay3d: 1,
    vector_flat: 1,
    watercolor: 1,
    papercut: 1,
    soft_3d: 1,
  };

  function coerceIllustrationStyleKey(v) {
    var s = String(v || "").trim();
    return ILLUSTRATION_STYLE_KEYS[s] ? s : "clay3d";
  }

  function getIllustrationStyle() {
    try {
      var v = localStorage.getItem(K_ILLUSTRATION_STYLE);
      if (v) return coerceIllustrationStyleKey(v);
    } catch (eSt) {}
    return "clay3d";
  }

  function setIllustrationStyle(mode) {
    try {
      localStorage.setItem(K_ILLUSTRATION_STYLE, coerceIllustrationStyleKey(mode));
    } catch (eSetSt) {}
  }

  function syncIllustrationStyleRadios() {
    if (!illustrationStyleFieldset) return;
    var m = getIllustrationStyle();
    var inp = illustrationStyleFieldset.querySelector(
      'input[name="sbIllustrationStyle"][value="' + m + '"]'
    );
    if (inp) inp.checked = true;
  }

  function readIllustrationStyleFromWizard() {
    if (!illustrationStyleFieldset) return getIllustrationStyle();
    var c = illustrationStyleFieldset.querySelector(
      'input[name="sbIllustrationStyle"]:checked'
    );
    return c ? coerceIllustrationStyleKey(c.value) : getIllustrationStyle();
  }

  /** True when this spread index has an illustration URL in story data (matches syncSpreadIllustrationFromStory). */
  function spreadRowHasIllustration(si) {
    if (!story || !story.pages) return false;
    var n = numSpreads();
    if (n < 1) return false;
    si = Math.max(0, Math.min(Math.floor(Number(si)), n - 1));
    if (si * 2 >= story.pages.length) {
      return !!(story.sceneImageUrl && String(story.sceneImageUrl).trim());
    }
    var rightP = story.pages[si * 2 + 1];
    var leftP = story.pages[si * 2];
    if (rightP && rightP.imageUrl && String(rightP.imageUrl).trim()) return true;
    if (leftP && leftP.imageUrl && String(leftP.imageUrl).trim()) return true;
    return false;
  }

  function syncReaderFacingLayoutClasses() {
    if (!spreadInnerEl) return;
    var wantFacing = getEffectiveReaderArtLayout() === "facing";
    var dataHasIll = !!(story && spreadRowHasIllustration(spreadIndex));
    var flyleafDom = spreadInnerEl.classList.contains("sb-flip-spread__inner--flyleaf-pane");
    /* Opening spread: flyleaf class can linger after the first real picture loads — facing stays off and type looks like duplex over art. */
    if (wantFacing && dataHasIll && flyleafDom) {
      clearArtFlyleaf();
      syncSpreadIllustrationFromStory();
    }
    var flyleaf = spreadInnerEl.classList.contains("sb-flip-spread__inner--flyleaf-pane");
    var hasArt =
      spreadInnerEl.classList.contains("sb-flip-spread__inner--has-art") || dataHasIll;
    var effective = wantFacing && hasArt && !flyleaf;

    spreadInnerEl.classList.toggle("sb-flip-spread__inner--art-facing", effective);

    if (effective) {
      /* Fixed facing: prose always on the left leaf, art always on the right (no alternating shells per spread). */
      spreadInnerEl.classList.add("sb-facing-text-on-left");
      spreadInnerEl.classList.remove("sb-facing-text-on-right");
    } else {
      spreadInnerEl.classList.remove(
        "sb-facing-text-on-left",
        "sb-facing-text-on-right"
      );
    }
  }

  function placeTextPageForFacingLayout() {
    if (!flipLeftShell || !flipRightShell || !spreadText) return;
    var textPage = spreadText.closest(".sb-flip-page--text");
    if (!textPage) return;

    var facingEffective =
      spreadInnerEl &&
      spreadInnerEl.classList.contains("sb-flip-spread__inner--art-facing");

    if (!facingEffective) {
      if (!flipLeftShell.contains(textPage)) {
        flipLeftShell.appendChild(textPage);
      }
      flipRightShell.setAttribute("aria-hidden", "true");
      return;
    }

    if (!flipLeftShell.contains(textPage)) {
      flipLeftShell.appendChild(textPage);
    }
    flipRightShell.setAttribute("aria-hidden", "true");
  }

  function updateSpreadPageNumberDisplay(siOverride) {
    if (!spreadPageNumEl || !spreadInnerEl) return;
    if (!spreadInnerEl.classList.contains("sb-flip-spread__inner--art-facing")) {
      spreadPageNumEl.textContent = "";
      return;
    }
    if (!story || !story.pages || numSpreads() < 1) {
      spreadPageNumEl.textContent = "";
      return;
    }
    var nSpr = numSpreads();
    var si = spreadIndex;
    if (siOverride !== undefined && siOverride !== null) {
      si = Math.max(0, Math.min(Math.floor(Number(siOverride)), Math.max(0, nSpr - 1)));
    }
    if (si * 2 >= story.pages.length) {
      spreadPageNumEl.textContent = "";
      return;
    }
    /* 1-based number of the text page shown (first page of each spread pair). */
    var pageNum = si * 2 + 1;
    spreadPageNumEl.textContent = String(pageNum);
  }

  var btnOpenCover = document.getElementById("sbOpenCover");
  var btnCloseBook = document.getElementById("sbCloseBook");
  var coverTitle = document.getElementById("sbCoverTitle");
  var coverAuthor = document.getElementById("sbCoverAuthor");
  var coverPanel = document.getElementById("sbCoverPanel");
  var btnPrev = document.getElementById("sbPrev");
  var btnNext = document.getElementById("sbNext");
  /** Wide screens (tablets / large landscape): edge-to-edge reader + fixed overlays. */
  var immersiveReaderMq =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(min-width: 768px)")
      : { matches: false, addEventListener: function () {} };
  var btnNew = document.getElementById("sbNew");
  var btnDownload = document.getElementById("sbDownloadBook");
  var btnShelf = document.getElementById("sbShelfBook");
  var actionsDock = document.getElementById("sbBookActionsDock");
  var actionsFab = document.getElementById("sbBookActionsFab");
  var shelfEl = document.getElementById("sbShelf");
  var btnVoiceName = document.getElementById("sbVoiceName");
  var btnVoicePlot = document.getElementById("sbVoicePlot");
  var voiceHintName = document.getElementById("sbVoiceNameHint");
  var voiceHintPlot = document.getElementById("sbVoicePlotHint");

  var SpeechRec =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition || null
      : null;

  var activeSpeech = null;
  /** @type {'name' | 'plot' | null} */
  var speechTarget = null;
  var plotSpeechPrefix = "";
  var plotSpeechAccum = "";

  function getSpeechRecognition() {
    return SpeechRec;
  }

  function setVoiceHint(nameMsg, plotMsg) {
    if (voiceHintName) {
      voiceHintName.textContent = nameMsg || "";
      voiceHintName.hidden = !nameMsg;
    }
    if (voiceHintPlot) {
      voiceHintPlot.textContent = plotMsg || "";
      voiceHintPlot.hidden = !plotMsg;
    }
  }

  function syncVoiceButtons() {
    var onName = speechTarget === "name";
    var onPlot = speechTarget === "plot";
    var onHeroPhotoName = speechTarget === "hero_photo_name";
    if (btnVoiceName) {
      btnVoiceName.classList.toggle("is-listening", onName);
      btnVoiceName.setAttribute("aria-pressed", onName ? "true" : "false");
      var nameLbl = btnVoiceName.querySelector(".sb-voice-btn__txt");
      if (nameLbl) nameLbl.textContent = onName ? "Stop" : "Speak";
    }
    if (btnVoicePlot) {
      btnVoicePlot.classList.toggle("is-listening", onPlot);
      btnVoicePlot.setAttribute("aria-pressed", onPlot ? "true" : "false");
      var plotLbl = btnVoicePlot.querySelector(".sb-voice-btn__txt");
      if (plotLbl) plotLbl.textContent = onPlot ? "Stop listening" : "Speak your idea";
    }
    if (btnHeroPhotoNameVoice) {
      btnHeroPhotoNameVoice.classList.toggle("is-listening", onHeroPhotoName);
      btnHeroPhotoNameVoice.setAttribute("aria-pressed", onHeroPhotoName ? "true" : "false");
      var hpLbl = btnHeroPhotoNameVoice.querySelector(".sb-voice-btn__txt");
      if (hpLbl) hpLbl.textContent = onHeroPhotoName ? "Stop" : "Speak";
    }
  }

  function setHeroPhotoNameVoiceHint(msg) {
    if (!heroPhotoNameVoiceHint) return;
    if (msg) {
      heroPhotoNameVoiceHint.textContent = msg;
      heroPhotoNameVoiceHint.hidden = false;
    } else {
      heroPhotoNameVoiceHint.textContent = "";
      heroPhotoNameVoiceHint.hidden = true;
    }
  }

  function setHeroPhotoNameInlineErr(msg) {
    if (!heroPhotoNameErr) return;
    if (msg) {
      heroPhotoNameErr.textContent = msg;
      heroPhotoNameErr.hidden = false;
    } else {
      heroPhotoNameErr.textContent = "";
      heroPhotoNameErr.hidden = true;
    }
  }

  /**
   * @param {{ preserveVoiceHints?: boolean }} [opts]
   */
  function stopSpeech(opts) {
    var preserveHints = opts && opts.preserveVoiceHints;
    var rec = activeSpeech;
    activeSpeech = null;
    speechTarget = null;
    plotSpeechPrefix = "";
    plotSpeechAccum = "";
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch (e) {}
    }
    syncVoiceButtons();
    setHeroPhotoNameVoiceHint("");
    if (!preserveHints) setVoiceHint("", "");
  }

  function startNameSpeech() {
    var Rec = getSpeechRecognition();
    if (!Rec || !nameInput) return;
    if (speechTarget === "name") {
      stopSpeech();
      return;
    }
    stopSpeech();
    stopStepGuideAudio();
    speechTarget = "name";
    var rec = new Rec();
    rec.lang = "en-GB";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      if (!e.results || !e.results.length) return;
      var t = e.results[0][0].transcript.trim();
      nameInput.value = t.slice(0, 24);
    };
    rec.onerror = function (e) {
      if (e.error === "aborted") return;
      var friendly =
        e.error === "not-allowed"
          ? "Microphone blocked — check browser settings or type instead."
          : e.error === "no-speech"
            ? "Didn’t hear anything. Tap Speak and try again."
            : "Speaking hit a snag. You can type instead.";
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint(friendly, "");
    };
    rec.onend = function () {
      if (activeSpeech !== rec) return;
      activeSpeech = null;
      speechTarget = null;
      plotSpeechPrefix = "";
      plotSpeechAccum = "";
      syncVoiceButtons();
      setVoiceHint("", "");
    };
    activeSpeech = rec;
    syncVoiceButtons();
    setVoiceHint("Listening… say your name", "");
    try {
      rec.start();
    } catch (err) {
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint("Couldn’t start the microphone. Try typing.", "");
    }
  }

  function startHeroPhotoNameSpeech() {
    var RecHp = getSpeechRecognition();
    if (!RecHp || !heroPhotoNameInput) return;
    if (speechTarget === "hero_photo_name") {
      stopSpeech();
      return;
    }
    stopSpeech();
    stopStepGuideAudio();
    speechTarget = "hero_photo_name";
    var recHp = new RecHp();
    recHp.lang = "en-GB";
    recHp.continuous = false;
    recHp.interimResults = false;
    recHp.maxAlternatives = 1;
    recHp.onresult = function (e) {
      if (!e.results || !e.results.length) return;
      var tHp = e.results[0][0].transcript.trim();
      heroPhotoNameInput.value = tHp.slice(0, 48);
      setHeroPhotoNameInlineErr("");
    };
    recHp.onerror = function (eHp) {
      if (eHp.error === "aborted") return;
      var friendlyHp =
        eHp.error === "not-allowed"
          ? "Microphone blocked — you can type the name instead."
          : eHp.error === "no-speech"
            ? "Didn't hear anyone — tap Speak again or type."
            : "Something went wrong — try typing.";
      stopSpeech({ preserveVoiceHints: true });
      setHeroPhotoNameVoiceHint(friendlyHp);
    };
    recHp.onend = function () {
      if (activeSpeech !== recHp) return;
      activeSpeech = null;
      speechTarget = null;
      plotSpeechPrefix = "";
      plotSpeechAccum = "";
      syncVoiceButtons();
      setHeroPhotoNameVoiceHint("");
    };
    activeSpeech = recHp;
    syncVoiceButtons();
    setHeroPhotoNameVoiceHint("Listening — say their name");
    try {
      recHp.start();
    } catch (errHp) {
      stopSpeech({ preserveVoiceHints: true });
      setHeroPhotoNameVoiceHint("Couldn't use the microphone — type instead.");
    }
  }

  function startPlotSpeech() {
    var Rec = getSpeechRecognition();
    if (!Rec || !plotInput) return;
    if (speechTarget === "plot") {
      stopSpeech();
      return;
    }
    stopSpeech();
    stopStepGuideAudio();
    speechTarget = "plot";
    plotSpeechPrefix = plotInput.value;
    plotSpeechAccum = "";
    var rec = new Rec();
    rec.lang = "en-GB";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var interim = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var piece = e.results[i][0].transcript;
        if (e.results[i].isFinal) plotSpeechAccum += piece;
        else interim += piece;
      }
      var tail = (plotSpeechAccum + interim).trim();
      var base = plotSpeechPrefix.replace(/\s+$/,"");
      var merged = (base && tail ? base + " " + tail : base + tail)
        .replace(/\s+/g, " ")
        .trim();
      plotInput.value = merged.slice(0, PLOT_INPUT_MAX);
    };
    rec.onerror = function (e) {
      if (e.error === "aborted") return;
      var friendly =
        e.error === "not-allowed"
          ? "Microphone blocked — check settings or type your idea."
          : e.error === "no-speech"
            ? "Didn’t catch that — tap Speak and try again."
            : "Speaking had a problem. Typing still works.";
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint("", friendly);
    };
    rec.onend = function () {
      if (activeSpeech !== rec) return;
      activeSpeech = null;
      speechTarget = null;
      plotSpeechPrefix = "";
      plotSpeechAccum = "";
      syncVoiceButtons();
      setVoiceHint("", "");
    };
    activeSpeech = rec;
    syncVoiceButtons();
    setVoiceHint("", "Listening… talk about your story. Tap Stop when you’re done.");
    try {
      rec.start();
    } catch (err) {
      stopSpeech({ preserveVoiceHints: true });
      setVoiceHint("", "Couldn’t start the microphone. Try typing.");
    }
  }

  function initVoiceUi() {
    if (!getSpeechRecognition()) {
      if (btnVoiceName) {
        btnVoiceName.hidden = true;
        btnVoiceName.classList.add("is-unavailable");
      }
      if (btnVoicePlot) {
        btnVoicePlot.hidden = true;
        btnVoicePlot.classList.add("is-unavailable");
      }
      return;
    }
    if (btnVoiceName) {
      btnVoiceName.addEventListener("click", function () { startNameSpeech(); });
    }
    if (btnVoicePlot) {
      btnVoicePlot.addEventListener("click", function () { startPlotSpeech(); });
    }
  }

  /** @type {number} */
  var journeyStep = 0;
  /** True when user skipped buddy (& still picks scene + plot together). Back returns to hero step. */
  var skippedBuddyAndPlace = false;
  /** @type {string} */
  var selectedChar = "unicorn";
  /** @type {string} */
  var selectedPlace = "beach";
  /** @type {string} book frame colour: "" = Auto, or "blue"|"green"|"pink" */
  var selectedBookCoverColor = "";
  /** @type {{ title: string, author?: string, readerFont?: string|null, readerArtLayout?: 'duplex'|'facing', storyTextMode?: 'prose'|'rhyme', storyLength?: 'short'|'medium'|'long', sceneImageUrl?: string|null, pages: { text: string, imageUrl: string|null }[] } | null} */
  var story = null;

  /** Matches clever-service STORY_READER_FONT_KEYS — body / tape-over-art / splash word stack per book. */
  var SB_READER_FONT_PRESETS = {
    fredoka: {
      body: '"Fredoka","Sniglet","Nunito",sans-serif',
      overArt: '"Schoolbell","Fredoka","Nunito",sans-serif',
      emphasis: '"Kalam","Fredoka","Nunito",cursive,sans-serif',
    },
    schoolbell: {
      body: '"Schoolbell","Nunito",sans-serif',
      overArt: '"Schoolbell","Nunito",sans-serif',
      emphasis: '"Kalam","Schoolbell","Nunito",cursive,sans-serif',
    },
    sniglet: {
      body: '"Sniglet","Fredoka","Nunito",sans-serif',
      overArt: '"Sniglet","Schoolbell","Nunito",sans-serif',
      emphasis: '"Sniglet","Fredoka","Nunito",sans-serif',
    },
    kalam: {
      body: '"Kalam","Sniglet","Nunito",cursive,sans-serif',
      overArt: '"Kalam","Schoolbell","Nunito",cursive,sans-serif',
      emphasis: '"Kalam","Fredoka","Nunito",cursive,sans-serif',
    },
    patrick: {
      body: '"Patrick Hand","Schoolbell","Nunito",cursive,sans-serif',
      overArt: '"Patrick Hand","Nunito",cursive,sans-serif',
      emphasis: '"Kalam","Patrick Hand","Nunito",cursive,sans-serif',
    },
    comic: {
      body: '"Comic Neue","Nunito",sans-serif',
      overArt: '"Comic Neue","Schoolbell","Nunito",sans-serif',
      emphasis: '"Sniglet","Comic Neue","Nunito",sans-serif',
    },
  };

  function normalizeReaderFontKey(key) {
    var k = key ? String(key).toLowerCase().trim() : "";
    return SB_READER_FONT_PRESETS[k] ? k : "fredoka";
  }
  var spreadIndex = 0;
  /** @type {boolean} */
  var spreadAnimLock = false;
  /** @type {number | null} — paint incoming duplex + prose early in the hinge */
  var midTurnIncomingTimer = null;
  var coverOpenGeneration = 0;

  function prefersReducedSpreadMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isTransformTransitionProperty(name) {
    return name === "transform" || name === "-webkit-transform";
  }

  function illustrationUrlAtSpreadIndex(si) {
    if (!story || !story.pages || !story.pages.length) return "";
    var nSpr = numSpreads();
    if (nSpr < 1) return "";
    si = Math.max(0, Math.min(si, nSpr - 1));
    if (si * 2 >= story.pages.length) {
      return storyImageDisplayUrl(story.sceneImageUrl || "");
    }
    var rightP = story.pages[si * 2 + 1];
    var raw = rightP && rightP.imageUrl ? String(rightP.imageUrl) : "";
    if (!raw) {
      var leftP = story.pages[si * 2];
      if (leftP && leftP.imageUrl) raw = String(leftP.imageUrl);
    }
    return storyImageDisplayUrl(raw);
  }

  /** First duplex art URL for inside-cover preview (skips blank front-matter spreads). */
  function firstSpreadArtUrlForCover() {
    if (!story || !story.pages) return "";
    var scene = story.sceneImageUrl
      ? storyImageDisplayUrl(String(story.sceneImageUrl))
      : "";
    if (scene) return scene;
    var n = Math.floor(story.pages.length / 2);
    for (var si = 0; si < n; si++) {
      var u = illustrationUrlAtSpreadIndex(si);
      if (u) return u;
    }
    return "";
  }

  function clearArtFlyleaf() {
    if (spreadArtFlyleaf) {
      spreadArtFlyleaf.hidden = true;
      spreadArtFlyleaf.innerHTML = "";
      spreadArtFlyleaf.setAttribute("hidden", "");
    }
    if (spreadInnerEl) {
      spreadInnerEl.classList.remove("sb-flip-spread__inner--flyleaf-pane");
    }
  }

  function bindReadableWordSpans(rootEl) {
    if (!rootEl) return;
    var wordSpans = rootEl.querySelectorAll(".sb-readable-word");
    for (var w = 0; w < wordSpans.length; w++) {
      wordSpans[w].addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var wordToRead = this.getAttribute("data-word");
        if (wordToRead) {
          readWordOutLoud(wordToRead, this);
        }
      });
    }
  }

  function clearSpreadTurnRevealFx() {
    if (spreadTextClip) {
      spreadTextClip.classList.remove("sb-flip-text__clip--reveal-turn");
      spreadTextClip.style.clipPath = "";
      spreadTextClip.style.webkitClipPath = "";
    }
    if (spreadArtBase) {
      spreadArtBase.classList.remove("sb-flip-spread__art-base--reveal-turn");
    }
  }

  function clearSpreadPeelTurnClasses() {
    var shell =
      spreadArtPeelShell || document.getElementById("sbSpreadArtPeel");
    if (!shell) return;
    shell.classList.remove(
      "sb-story-pageflip--turn-next-1",
      "sb-story-pageflip--snap-next",
      "sb-story-pageflip--turn-next-2",
      "sb-story-pageflip--turn-prev-1",
      "sb-story-pageflip--snap-prev",
      "sb-story-pageflip--turn-prev-2"
    );
  }

  /** Snap peel to reset without animating back (avoids half-way transform carrying into the next turn). */
  function snapPeelShellToRest(peelShell) {
    if (!peelShell) return;
    peelShell.style.transition = "none";
    peelShell.style.webkitTransition = "none";
    clearSpreadPeelTurnClasses();
    void peelShell.offsetWidth;
    peelShell.style.removeProperty("transition");
    peelShell.style.removeProperty("-webkit-transition");
  }

  function clearSpreadTurnClasses() {
    if (midTurnIncomingTimer != null) {
      window.clearTimeout(midTurnIncomingTimer);
      midTurnIncomingTimer = null;
    }
    if (spreadInnerEl) {
      spreadInnerEl.classList.remove(
        "sb-flip-spread__inner--turn-out-next",
        "sb-flip-spread__inner--turn-out-prev",
        "sb-flip-spread__inner--turn-in-next",
        "sb-flip-spread__inner--turn-in-prev",
        "sb-flip-spread__inner--fade-out",
        "sb-flip-spread__inner--fade-in",
        "sb-flip-spread__inner--peel-turning",
        "sb-flip-spread__inner--facing-peel-turn"
      );
    }
    if (flipSpreadEl) {
      flipSpreadEl.classList.remove("sb-flip-spread--peel-active");
    }
    if (bookSpreadEl) {
      bookSpreadEl.classList.remove("sb-book-spread--peel-overflow");
    }
    clearSpreadPeelTurnClasses();
    clearSpreadTurnRevealFx();
    clearPeelBackTextColumn();
  }

  function bindCpShellTurnEnd(shell, cb) {
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      shell.removeEventListener("transitionend", onTe);
      shell.removeEventListener("webkitTransitionEnd", onTe);
      window.clearTimeout(tid);
      cb();
    }
    function onTe(ev) {
      if (!ev || ev.target !== shell) return;
      var pn = ev.propertyName || "";
      if (pn !== "" && !isTransformTransitionProperty(pn)) return;
      finish();
    }
    shell.addEventListener("transitionend", onTe);
    shell.addEventListener("webkitTransitionEnd", onTe);
    var tid = window.setTimeout(finish, 480);
  }

  /**
   * Incoming spread is already authoritative in `spreadIndex`; paint it while the hinge runs so
   * copy + duplex feel ahead of the fold.
   */
  function paintIncomingSpreadWhilePeeling() {
    writeSpreadTextMetaFromStory();
    syncSpreadIllustrationFromStory();
    syncReaderFacingLayoutClasses();
    placeTextPageForFacingLayout();
    updateSpreadPageNumberDisplay();
    nudgeDuplexArtComposite();
  }

  /**
   * Mid–page-turn (~90deg) WebKit composites both peel faces edge-on (`backface-visibility:hidden`),
   * exposing the stationary duplex cover. Keeping that cover on **outgoing** art avoids a decoding
   * gap; `peelImg`/`peelBack` already carry outgoing + incoming paints for the hinge.
   * @param {HTMLImageElement | null | undefined} a
   * @param {HTMLImageElement | null | undefined} b
   * @param {() => void} run
   */
  function decodePeelImagesThenAnimate(a, b, run) {
    var ran = false;
    function runOnce() {
      if (ran) return;
      ran = true;
      run();
    }
    /* Never strand spreadAnimLock if decode() or load handlers hang (slow network / odd WebKit). */
    var safetyTid = window.setTimeout(runOnce, 1800);

    var imgs = [];
    if (a && a.src) imgs.push(a);
    if (b && b.src) imgs.push(b);
    if (imgs.length === 0) {
      window.clearTimeout(safetyTid);
      runOnce();
      return;
    }

    /** @returns {Promise<void>} */
    function decodeImg(img) {
      return new Promise(function (resolve) {
        try {
          if (!img.complete) {
            img.addEventListener("load", function onLoad() {
              img.removeEventListener("load", onLoad);
              img.removeEventListener("error", onErr);
              tryDecode();
            });
            img.addEventListener(
              "error",
              function onErr() {
                img.removeEventListener("load", onLoad);
                img.removeEventListener("error", onErr);
                resolve();
              },
              { once: true }
            );
            return;
          }
          tryDecode();
        } catch (_e) {
          resolve();
        }

        function tryDecode() {
          if (typeof img.decode === "function") {
            img.decode().then(resolve, resolve);
          } else {
            resolve();
          }
        }
      });
    }

    var decodeRaceMs = 48;
    var cap = new Promise(function (resolve) {
      window.setTimeout(resolve, decodeRaceMs);
    });

    Promise.race([Promise.all(imgs.map(decodeImg)), cap])
      .then(function () {
        window.clearTimeout(safetyTid);
        runOnce();
      })
      .catch(function () {
        window.clearTimeout(safetyTid);
        runOnce();
      });
  }

  function bumpSpreadIndex(delta) {
    spreadIndex += delta;
    var nSpr = numSpreads();
    spreadIndex = Math.max(0, Math.min(spreadIndex, nSpr - 1));
    applySpreadContent();
  }

  function navigateSpreadWithRightPageTurn(delta) {
    var peelShell =
      spreadArtPeelShell || document.getElementById("sbSpreadArtPeel");
    if (spreadAnimLock) return;
    if (!peelShell) {
      navigateSpreadInstant(delta);
      return;
    }

    var nSpr = numSpreads();
    var fromSi = spreadIndex;
    var toSi = Math.max(0, Math.min(spreadIndex + delta, nSpr - 1));
    if (toSi === fromSi) return;

    var outArt = illustrationUrlAtSpreadIndex(fromSi);
    var inArt = illustrationUrlAtSpreadIndex(toSi);
    /* Flyleaf / dedication spreads have no illustration URL; use a white tile so the peel still runs (matches old books where spread 0 already had art). */
    if (!outArt && !inArt) {
      navigateSpreadInstant(delta);
      return;
    }
    var peelBlank =
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2"><rect width="2" height="2" fill="#ffffff"/></svg>'
      );
    var peelOut = outArt || peelBlank;
    var peelIn = inArt || peelBlank;

    spreadIndex = toSi;

    spreadAnimLock = true;
    setSpreadNavBusy(true);
    if (midTurnIncomingTimer != null) {
      window.clearTimeout(midTurnIncomingTimer);
      midTurnIncomingTimer = null;
    }
    snapPeelShellToRest(peelShell);
    clearSpreadTurnRevealFx();
    if (spreadInnerEl) {
      spreadInnerEl.classList.add("sb-flip-spread__inner--peel-turning");
    }
    if (flipSpreadEl) {
      flipSpreadEl.classList.add("sb-flip-spread--peel-active");
    }
    if (bookSpreadEl) {
      bookSpreadEl.classList.add("sb-book-spread--peel-overflow");
    }

    /*
     * Keep duplex base (#sbSpreadArtCover) on the **outgoing** illustration in one assignment.
     * Previously we synced incoming then overwrote — two src changes trigger WebKit/iPad decode flicker.
     */
    syncSpreadIllustrationFromStory({ duplexCoverSrc: peelOut });
    syncReaderFacingLayoutClasses();
    placeTextPageForFacingLayout();

    writeSpreadTextMetaFromStory(fromSi);
    updateSpreadPageNumberDisplay(fromSi);
    fillPeelBackTextColumn(spreadIndex);
    updatePagerHints();

    var peelImg =
      spreadArtPeelImg || document.getElementById("sbSpreadArtPeelImg");
    var peelBackImg = document.getElementById("sbSpreadArtPeelBackImg");
    var outgoingLeftShell = document.getElementById("sbSpreadArtOutgoingLeft");
    var outgoingLeftImg = document.getElementById("sbSpreadArtOutgoingLeftImg");

    if (peelImg) {
      peelImg.alt = "";
      peelImg.referrerPolicy = "no-referrer";
      if ((peelImg.getAttribute("src") || "") !== peelOut) {
        peelImg.src = peelOut;
      }
    }

    if (peelBackImg) {
      peelBackImg.alt = "";
      peelBackImg.referrerPolicy = "no-referrer";
      if ((peelBackImg.getAttribute("src") || "") !== peelIn) {
        peelBackImg.src = peelIn;
      }
    }

    if (outgoingLeftImg) {
      outgoingLeftImg.alt = "";
      outgoingLeftImg.referrerPolicy = "no-referrer";
      if ((outgoingLeftImg.getAttribute("src") || "") !== peelOut) {
        outgoingLeftImg.src = peelOut;
      }
    }

    var peelFrontRoot = peelShell.querySelector(".sb-flip-spread__peel-front");
    if (spreadPeelFrontText) spreadPeelFrontText.innerHTML = "";
    if (peelFrontRoot) {
      peelFrontRoot.classList.remove("sb-flip-spread__peel-front--recto-prose");
    }

    peelShell.hidden = false;
    peelShell.removeAttribute("hidden");
    peelShell.style.removeProperty("display");

    var peelBackEl = peelShell.querySelector(".sb-flip-spread__peel-back");
    if (peelBackEl) {
      peelBackEl.classList.remove("sb-flip-spread__peel-back--verso-text");
    }

    if (outgoingLeftShell) {
      outgoingLeftShell.hidden = false;
      outgoingLeftShell.removeAttribute("hidden");
      outgoingLeftShell.style.display = "block";
    }

    var isNext = delta > 0;
    var cls1 = isNext
      ? "sb-story-pageflip--turn-next-1"
      : "sb-story-pageflip--turn-prev-1";

    decodePeelImagesThenAnimate(peelImg, peelBackImg, function () {
      void peelShell.offsetWidth;
      window.requestAnimationFrame(function () {
        peelShell.classList.add(cls1);
        midTurnIncomingTimer = window.setTimeout(function () {
          midTurnIncomingTimer = null;
          if (
            !spreadInnerEl ||
            !spreadInnerEl.classList.contains("sb-flip-spread__inner--peel-turning")
          ) {
            return;
          }
          paintIncomingSpreadWhilePeeling();
        }, 64);
      });

      bindCpShellTurnEnd(peelShell, function peelTurnDone() {
        try {
          if (midTurnIncomingTimer != null) {
            window.clearTimeout(midTurnIncomingTimer);
            midTurnIncomingTimer = null;
          }

          clearPeelBackTextColumn();

          paintIncomingSpreadWhilePeeling();

          peelShell.style.display = "none";
          peelShell.hidden = true;

          if (outgoingLeftShell) {
            outgoingLeftShell.hidden = true;
            outgoingLeftShell.style.display = "none";
          }

          if (peelImg) peelImg.removeAttribute("src");
          if (peelBackImg) peelBackImg.removeAttribute("src");
          if (outgoingLeftImg) outgoingLeftImg.removeAttribute("src");

          snapPeelShellToRest(peelShell);

          clearSpreadTurnRevealFx();
          if (flipSpreadEl) {
            flipSpreadEl.classList.remove("sb-flip-spread--peel-active");
          }
          if (bookSpreadEl) {
            bookSpreadEl.classList.remove("sb-book-spread--peel-overflow");
          }
          if (spreadInnerEl) {
            spreadInnerEl.classList.remove("sb-flip-spread__inner--peel-turning");
            spreadInnerEl.classList.remove("sb-flip-spread__inner--facing-peel-turn");
            var textPages = spreadInnerEl.querySelectorAll(".sb-flip-page--text");
            for (var ti = 0; ti < textPages.length; ti++) {
              textPages[ti].style.animation = "";
              textPages[ti].style.opacity = "";
              var sheetKids = textPages[ti].querySelectorAll(
                ".sb-flip-page__sheet > *"
              );
              for (var kj = 0; kj < sheetKids.length; kj++) {
                sheetKids[kj].style.animation = "";
                sheetKids[kj].style.opacity = "";
              }
            }
          }
          updatePagerHints();
        } finally {
          spreadAnimLock = false;
          setSpreadNavBusy(false);
        }
      });
    });
  }

  function navigateSpreadInstant(delta) {
    spreadAnimLock = false;
    bumpSpreadIndex(delta);
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {
        syncSpreadIllustrationFromStory();
      });
    }
  }

  function navigateSpread(delta) {
    if (!story) return;
    if (book && book.classList.contains("sb-book--cover-visible")) return;
    if (delta > 0 && spreadIndex >= numSpreads() - 1) return;
    if (delta < 0 && spreadIndex <= 0) return;
    if (prefersReducedSpreadMotion()) {
      navigateSpreadInstant(delta);
      return;
    }
    if (spreadAnimLock) return;
    navigateSpreadWithRightPageTurn(delta);
  }

  function setSpreadNavBusy(locked) {
    if (!btnPrev || !btnNext) return;
    if (locked) {
      btnPrev.disabled = true;
      btnNext.disabled = true;
    } else {
      updatePagerHints();
    }
  }

  function syncCloseBookButton() {
    if (!btnCloseBook) return;
    var readerOpen =
      readerStack &&
      readerStack.classList.contains("sb-reader-stack--open");
    var coverShowing =
      book && book.classList.contains("sb-book--cover-visible");
    var show =
      book && story && readerOpen && !coverShowing;
    if (show) {
      btnCloseBook.hidden = false;
      btnCloseBook.removeAttribute("aria-hidden");
    } else {
      btnCloseBook.hidden = true;
      btnCloseBook.setAttribute("aria-hidden", "true");
    }
  }

  function closeBookCover() {
    stopReading();
    if (!book || !readerStack) return;
    if (book.classList.contains("sb-book--cover-visible")) return;
    if (!readerStack.classList.contains("sb-reader-stack--open")) {
      return;
    }

    coverOpenGeneration += 1;

    spreadAnimLock = false;
    clearSpreadTurnClasses();
    setSpreadNavBusy(false);

    readerStack.classList.remove("sb-reader-stack--open");
    book.classList.add("sb-book--cover-visible");
    if (readerPages) readerPages.setAttribute("aria-hidden", "true");
    if (btnOpenCover) {
      btnOpenCover.removeAttribute("aria-hidden");
      btnOpenCover.removeAttribute("tabindex");
    }
    syncCloseBookButton();
    updatePagerHints();
  }

  function openBookCover() {
    if (!book || !book.classList.contains("sb-book--cover-visible")) return;
    if (!readerStack) return;

    spreadIndex = 0;
    coverOpenGeneration += 1;
    readerStack.classList.add("sb-reader-stack--open");
    book.classList.remove("sb-book--cover-visible");
    if (readerPages) readerPages.removeAttribute("aria-hidden");
    if (btnOpenCover) {
      btnOpenCover.setAttribute("aria-hidden", "true");
      btnOpenCover.tabIndex = -1;
    }
    syncCloseBookButton();
    updatePagerHints();

    function paintOpenSpread() {
      applySpreadContent();
    }
    paintOpenSpread();
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(paintOpenSpread);
      });
    }
    var plate = book.querySelector(".sb-reader-book");
    if (plate && !prefersReducedSpreadMotion()) {
      var settled = false;
      function onPlateTransitionEnd(ev) {
        if (settled || ev.target !== plate) return;
        if (ev.propertyName !== "max-width") return;
        settled = true;
        plate.removeEventListener("transitionend", onPlateTransitionEnd);
        paintOpenSpread();
      }
      plate.addEventListener("transitionend", onPlateTransitionEnd);
      window.setTimeout(function () {
        if (!settled) {
          settled = true;
          paintOpenSpread();
        }
        plate.removeEventListener("transitionend", onPlateTransitionEnd);
      }, 1300);
    }
  }

  function resetBookCoverForWizard() {
    coverOpenGeneration += 1;
    if (readerStack) {
      readerStack.classList.remove("sb-reader-stack--open");
    }
    if (book) book.classList.remove("sb-book--cover-visible");
    if (readerPages) readerPages.setAttribute("aria-hidden", "true");
    if (btnOpenCover) {
      btnOpenCover.removeAttribute("aria-hidden");
      btnOpenCover.removeAttribute("tabindex");
    }
    syncCloseBookButton();
  }

  function applyBookThemingFromStory() {
    if (!book || !story) return;

    var c = story.bookColor ? String(story.bookColor).toLowerCase() : "";
    var themes = {
      blue: ["#2563eb", "#dbeafe", "#1d4ed8", "#1e40af", "#1e3a8a"],
      navy: ["#1e3a8a", "#dbeafe", "#1e40af", "#172554", "#0f172a"],
      green: ["#16a34a", "#dcfce7", "#15803d", "#166534", "#14532d"],
      mint: ["#10b981", "#d1fae5", "#059669", "#047857", "#065f46"],
      pink: ["#db2777", "#fce7f3", "#be185d", "#9d174d", "#831843"],
      coral: ["#f43f5e", "#ffe4e6", "#e11d48", "#be123c", "#9f1239"],
      lilac: ["#a855f7", "#f3e8ff", "#9333ea", "#7e22ce", "#6b21a8"],
      purple: ["#7c3aed", "#ede9fe", "#6d28d9", "#5b21b6", "#4c1d95"],
      orange: ["#ea580c", "#ffedd5", "#c2410c", "#9a3412", "#7c2d12"],
      red: ["#dc2626", "#fee2e2", "#b91c1c", "#991b1b", "#7f1d1d"],
      yellow: ["#ca8a04", "#fef9c3", "#a16207", "#854d0e", "#713f12"],
      teal: ["#0d9488", "#ccfbf1", "#0f766e", "#115e59", "#134e4a"],
    };
    var t = themes[c];
    if (t) {
      book.style.setProperty("--sb-flip-red", t[0]);
      book.style.setProperty("--sb-flip-light", t[1]);
      book.style.setProperty("--sb-flip-mid", t[2]);
      book.style.setProperty("--sb-flip-dark", t[3]);
      book.style.setProperty("--sb-flip-darker", t[4]);
    } else {
      book.style.setProperty("--sb-flip-red", "#db2777");
      book.style.setProperty("--sb-flip-light", "#fce7f3");
      book.style.setProperty("--sb-flip-mid", "#be185d");
      book.style.setProperty("--sb-flip-dark", "#9d174d");
      book.style.setProperty("--sb-flip-darker", "#831843");
    }

    var preset =
      SB_READER_FONT_PRESETS[normalizeReaderFontKey(story.readerFont)];
    book.style.setProperty("--sb-reader-font-body", preset.body);
    book.style.setProperty("--sb-reader-font-over-art", preset.overArt);
    book.style.setProperty("--sb-reader-font-emphasis", preset.emphasis);

    var u = story.sceneImageUrl;
    if (u) {
      book.classList.add("sb-book--themed");
      // Remove setting the background image on the entire book container
      book.style.backgroundImage = "";
      if (coverPanel) {
        coverPanel.classList.add("sb-cover__panel--themed");
        var safeUrl = String(u).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        coverPanel.style.setProperty("--sb-cover-photo", 'url("' + safeUrl + '")');
      }
    } else {
      book.classList.remove("sb-book--themed");
      book.style.backgroundImage = "";
      if (coverPanel) {
        coverPanel.classList.remove("sb-cover__panel--themed");
        coverPanel.style.removeProperty("--sb-cover-photo");
      }
    }
  }

  function clearBookTheming() {
    if (!book) return;
    book.style.removeProperty("--sb-flip-red");
    book.style.removeProperty("--sb-flip-light");
    book.style.removeProperty("--sb-flip-mid");
    book.style.removeProperty("--sb-flip-dark");
    book.style.removeProperty("--sb-flip-darker");
    book.style.removeProperty("--sb-reader-font-body");
    book.style.removeProperty("--sb-reader-font-over-art");
    book.style.removeProperty("--sb-reader-font-emphasis");
    book.classList.remove("sb-book--themed");
    book.style.backgroundImage = "";
    book.style.removeProperty("--sb-cover-inside-art");
    if (coverPanel) {
      coverPanel.classList.remove("sb-cover__panel--themed");
      coverPanel.style.removeProperty("--sb-cover-photo");
    }
  }

  function numSpreads() {
    return story && story.pages ? Math.floor(story.pages.length / 2) + 1 : 0;
  }

  /** Local preview only — same shape as OpenAI output (pairs: text, then picture). */
  function buildSampleStory() {
    var imgs = [
      "images/colouring/template-winged-unicorn.png",
      "images/colouring/template-dino-hill.png",
      "images/character-freya.png",
      "images/math-race-dino.png",
      "images/colouring/template-mermaid.png",
      "images/character-sofia-running.png",
    ];
    var texts = [
      "Once upon a time, a small fox named Mira found a silver star glinting in the tall grass near the edge of the woods.",
      "The star whispered that it had tumbled from the sky and needed to be home before sunrise. Mira promised to help.",
      "She rolled the star gently in a leaf-boat down the brook, past sleepy ducks and sparkling stones.",
      "At the hill of three oaks, a wise crow pointed to the clearest patch of night where the sky looked soft as velvet.",
      "Mira tossed the star as high as she could. It caught a breeze and rose — tiny at first, then bright again.",
      "By morning the sky was ordinary blue, but Mira knew the star was safe. She curled up in her den, proud and cosy.",
    ];
    var pages = [];
    for (var s = 0; s < 6; s++) {
      pages.push({ text: texts[s], imageUrl: null });
      pages.push({ text: "", imageUrl: imgs[s] });
    }
    pages.unshift(
      { text: "", imageUrl: null },
      {
        text: "This book was brought to you by the wonderful mind of Mira.",
        imageUrl: null,
      }
    );
    var rfKeys = Object.keys(SB_READER_FONT_PRESETS);
    var rfPick = rfKeys[(Math.random() * rfKeys.length) | 0] || "fredoka";
    return {
      title: "Mira and the fallen star (sample)",
      bookColor: "blue",
      readerFont: rfPick,
      readerArtLayout: "duplex",
      storyTextMode: "rhyme",
      storyLength: "medium",
      sceneImageUrl: null,
      pages: pages,
      isSample: true,
    };
  }

  /** Words in ALL CAPS (sound effects) — skip common short words so body text stays normal. */
  var SB_BIG_WORD_STOP = {
    THE: true,
    AND: true,
    BUT: true,
    FOR: true,
    WAS: true,
    ARE: true,
    WERE: true,
    NOT: true,
    SHE: true,
    HER: true,
    HIS: true,
    HIM: true,
    YOU: true,
    ALL: true,
    CAN: true,
    HAD: true,
    HAS: true,
    ONE: true,
    TWO: true,
    DAY: true,
    WAY: true,
    OUT: true,
    OFF: true,
    TOO: true,
    WHO: true,
    OUR: true,
    SAY: true,
    YES: true,
    NOW: true,
    NEW: true,
    HOW: true,
    WHY: true,
    LET: true,
    GOT: true,
    GET: true,
    BOY: true,
    GIRL: true,
    MAN: true,
    MEN: true,
    MUM: true,
    DAD: true,
  };

  function isBigWordToken(part) {
    if (!part) {
      return false;
    }
    var letters = part.replace(/[^A-Za-z]/g, "");
    if (letters.length < 3) {
      return false;
    }
    if (letters !== letters.toUpperCase()) {
      return false;
    }
    if (SB_BIG_WORD_STOP[letters]) {
      return false;
    }
    return true;
  }

  /** Title-case tokens that aren’t shouty CAPS effects — skips common prose words. Used for playful emphasis on facing pages. */
  var SB_PROPER_NOUN_SKIP = {
    THE: true,
    AND: true,
    BUT: true,
    FOR: true,
    ARE: true,
    WAS: true,
    WERE: true,
    NOT: true,
    HER: true,
    HIS: true,
    HIM: true,
    SHE: true,
    HAS: true,
    HAD: true,
    YOU: true,
    YOUR: true,
    OUR: true,
    ITS: true,
    THEY: true,
    THEM: true,
    THEIR: true,
    THERE: true,
    THESE: true,
    THOSE: true,
    THIS: true,
    THAT: true,
    THEN: true,
    THAN: true,
    THEYRE: true,
    WITH: true,
    FROM: true,
    INTO: true,
    OVER: true,
    UPON: true,
    ALSO: true,
    VERY: true,
    JUST: true,
    ONLY: true,
    EVEN: true,
    SUCH: true,
    SOME: true,
    MOST: true,
    MORE: true,
    EACH: true,
    EVERY: true,
    BOTH: true,
    AFTER: true,
    BEFORE: true,
    WHILE: true,
    WHICH: true,
    WHOSE: true,
    WHERE: true,
    WHAT: true,
    WHEN: true,
    WHY: true,
    HOW: true,
    WHO: true,
    COULD: true,
    WOULD: true,
    SHOULD: true,
    MIGHT: true,
    MUST: true,
    ABOUT: true,
    AROUND: true,
    THROUGH: true,
    AGAIN: true,
    STILL: true,
    ONCE: true,
    ALREADY: true,
    SUDDENLY: true,
    MAYBE: true,
    PERHAPS: true,
    QUITE: true,
    EITHER: true,
    NEITHER: true,
    ANOTHER: true,
    OTHER: true,
    SOMETHING: true,
    NOTHING: true,
    ANYONE: true,
    SOMEONE: true,
    EVERYONE: true,
    ANYTHING: true,
    EVERYTHING: true,
    ONE: true,
    TWO: true,
    ALL: true,
    ANY: true,
    CAN: true,
    GOT: true,
    GET: true,
    GETS: true,
    WAY: true,
    OUT: true,
    DAY: true,
    NEW: true,
    NOW: true,
    SAY: true,
    SAYS: true,
    SAID: true,
    ASKED: true,
    BACK: true,
    DOWN: true,
    MADE: true,
    MAKE: true,
    WENT: true,
    GOES: true,
    CAME: true,
    LOOKED: true,
    WANTED: true,
    BECAUSE: true,
    THOUGHT: true,
    ALTHOUGH: true,
    MUM: true,
    DAD: true,
    MOM: true,
    SON: true,
    BOY: true,
    GIRL: true,
    MAN: true,
    MEN: true,
  };

  /** Single capitalised name / place that should pop (Sophia, Remy — not SHE, WHICH, WHO). */
  function isStoryKeyWordToken(part) {
    if (!part || isBigWordToken(part)) {
      return false;
    }
    var t = String(part)
      .trim()
      .replace(/^[\u201c\u201d\u2018\u2019"""'`(]+/, "")
      .replace(/[.,!?;:\u2014\u2013)\u201d"'"…\]]+$/, "")
      .trim();
    var m = /^([A-Z][a-z]{2,})(?:'s)?$/.exec(t);
    var core = m ? m[1] : "";
    if (!core || core.length < 3 || SB_PROPER_NOUN_SKIP[core.toUpperCase()]) {
      return false;
    }
    return true;
  }

  function storyPageTextToReadableHtml(text) {
    var lines = escapeHtml(String(text || ""))
      .replace(/\r/g, "")
      .split("\n");
    var htmlLines = [];
    for (var li = 0; li < lines.length; li++) {
      var words = lines[li].split(/\s+/).filter(function (w) {
        return w.length > 0;
      });
      var spans = [];
      for (var wi = 0; wi < words.length; wi++) {
        var word = words[wi];
        var cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()'"”]/g, "");
        var cls = "sb-readable-word";
        if (isBigWordToken(word)) {
          cls += " sb-big-word";
        } else if (isStoryKeyWordToken(word)) {
          cls += " sb-key-word";
        }
        spans.push(
          '<span class="' +
            cls +
            '" data-word="' +
            escapeAttr(cleanWord) +
            '">' +
            word +
            "</span>"
        );
      }
      htmlLines.push(spans.join(" "));
    }
    return htmlLines.join("<br/>");
  }

  function clearPeelBackTextColumn() {
    if (spreadPeelBackText) spreadPeelBackText.innerHTML = "";
    var peelShell = spreadArtPeelShell || document.getElementById("sbSpreadArtPeel");
    if (peelShell) {
      var peelBack = peelShell.querySelector(".sb-flip-spread__peel-back");
      if (peelBack) {
        peelBack.classList.remove("sb-flip-spread__peel-back--verso-text");
      }
      var peelFront = peelShell.querySelector(".sb-flip-spread__peel-front");
      if (peelFront) {
        peelFront.classList.remove("sb-flip-spread__peel-front--recto-prose");
      }
    }
    if (spreadPeelFrontText) spreadPeelFrontText.innerHTML = "";
  }

  /**
   * Left column content for one spread (prose words HTML, The End block, or empty).
   * @param {number} si
   * @returns {{ kind: "empty"|"theend"|"prose", html?: string }}
   */
  function spreadLeftColumnBlockAtSi(si) {
    if (!story || !story.pages || !story.pages.length) {
      return { kind: "empty" };
    }
    var n = numSpreads();
    if (n < 1) return { kind: "empty" };
    si = Math.max(0, Math.min(Number(si), n - 1));
    if (si * 2 >= story.pages.length) {
      return {
        kind: "theend",
        html:
          '<div class="sb-the-end-wrap" role="status">' +
          '<h2 class="sb-the-end-title">The End</h2>' +
          '<p class="sb-the-end-lead">We hope you enjoyed the story!</p>' +
          "</div>",
      };
    }
    var leftP = story.pages[si * 2];
    if (leftP && leftP.text) {
      return { kind: "prose", html: storyPageTextToReadableHtml(leftP.text) };
    }
    return { kind: "empty" };
  }

  /**
   * Right column of a spread’s story pages (prose HTML).
   * @param {number} si
   * @returns {{ kind: "empty"|"theend"|"prose", html?: string }}
   */
  function spreadRightColumnBlockAtSi(si) {
    if (!story || !story.pages || !story.pages.length) {
      return { kind: "empty" };
    }
    var n = numSpreads();
    if (n < 1) return { kind: "empty" };
    si = Math.max(0, Math.min(Number(si), n - 1));
    if (si * 2 >= story.pages.length) {
      return {
        kind: "theend",
        html:
          '<div class="sb-the-end-wrap" role="status">' +
          '<h2 class="sb-the-end-title">The End</h2>' +
          '<p class="sb-the-end-lead">We hope you enjoyed the story!</p>' +
          "</div>",
      };
    }
    var ri = si * 2 + 1;
    if (ri >= story.pages.length) {
      return { kind: "empty" };
    }
    var rightP = story.pages[ri];
    if (rightP && rightP.text) {
      return { kind: "prose", html: storyPageTextToReadableHtml(rightP.text) };
    }
    return { kind: "empty" };
  }

  /**
   * Prose for the visible text column in facing layout: the **first** story page of each spread pair
   * (index 2×si), matching how books are generated (text page, then picture page).
   * If that page has no body copy, falls back to the paired right page (captions / odd authoring).
   * Duplex / non-facing uses the left column only, same as before.
   * @param {number} si
   * @returns {{ kind: "empty"|"theend"|"prose", html?: string }}
   */
  function spreadFacingReaderTextBlockAtSi(si) {
    if (!story || !story.pages || !story.pages.length) {
      return { kind: "empty" };
    }
    if (
      !spreadInnerEl ||
      !spreadInnerEl.classList.contains("sb-flip-spread__inner--art-facing")
    ) {
      return spreadLeftColumnBlockAtSi(si);
    }
    var primary = spreadLeftColumnBlockAtSi(si);
    if (primary.kind !== "empty") {
      return primary;
    }
    return spreadRightColumnBlockAtSi(si);
  }

  /**
   * Back of the turning leaf during peel: duplex uses left-column text on the verso.
   * Facing (picture-page) layouts must leave this empty: duplicating prose on the peel paints a
   * mirrored glyph layer over the static left sheet mid-rotate on WebKit (“ghost” type swap).
   * @param {number} si  Incoming spread index (spreadIndex / toSi during peel).
   */
  function fillPeelBackTextColumn(si) {
    if (!spreadPeelBackText) return;
    if (
      spreadInnerEl &&
      spreadInnerEl.classList.contains("sb-flip-spread__inner--art-facing")
    ) {
      spreadPeelBackText.innerHTML = "";
      return;
    }
    var block = spreadLeftColumnBlockAtSi(si);
    if (block.kind === "prose" && block.html) {
      spreadPeelBackText.innerHTML =
        '<p class="sb-flip-text"><span class="sb-flip-text__highlight">' +
        block.html +
        "</span></p>";
      bindReadableWordSpans(spreadPeelBackText);
    } else if (block.kind === "theend" && block.html) {
      spreadPeelBackText.innerHTML = block.html;
    } else {
      spreadPeelBackText.innerHTML = "";
    }
  }

  function openSampleBook() {
    story = buildSampleStory();
    spreadIndex = 0;
    showBook();
  }

  /** @param {number} [textSiOverride]  Spread index for prose (facing uses primary text page of the pair). */
  function writeSpreadTextMetaFromStory(textSiOverride) {
    if (!story || !spreadText) return;
    var n = numSpreads();
    if (n < 1) return;
    var si;
    if (textSiOverride !== undefined && textSiOverride !== null) {
      si = Math.max(0, Math.min(Number(textSiOverride), n - 1));
    } else {
      spreadIndex = Math.max(0, Math.min(spreadIndex, n - 1));
      si = spreadIndex;
    }

    stopReading();

    var block = spreadFacingReaderTextBlockAtSi(si);
    if (block.kind === "theend" && block.html) {
      spreadText.innerHTML = block.html;
      if (spreadTextActions) {
        spreadTextActions.hidden = true;
        spreadTextActions.style.display = "none";
      }
      return;
    }
    if (block.kind === "prose" && block.html) {
      spreadText.innerHTML = block.html;
      bindReadableWordSpans(spreadText);
      if (spreadTextActions) {
        spreadTextActions.hidden = false;
        spreadTextActions.style.display = "flex";
      }
      return;
    }
    spreadText.innerHTML = "";
    if (spreadTextActions) {
      spreadTextActions.hidden = true;
      spreadTextActions.style.display = "none";
    }
  }

  /** WebKit/Safari sometimes composites the duplex cover one frame late after flyleaf → first art; nudge after decode. */
  function nudgeDuplexArtComposite() {
    if (!spreadArtCover || !spreadArtCover.src) return;
    var el = spreadArtCover;
    var rafTwice = function () {
      if (typeof window.requestAnimationFrame !== "function") return;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (el && el.src) void el.offsetWidth;
        });
      });
    };
    if (typeof el.decode === "function") {
      el.decode().then(rafTwice, rafTwice);
    } else {
      rafTwice();
    }
  }

  /**
   * Align reader illustrations with `spreadIndex`.
   * @param {{ duplexCoverSrc?: string }} opt — When set (page-turn peel), `#sbSpreadArtCover` uses this URL
   * instead of the spread’s canonical art so Safari/WebKit never briefly paints the incoming image then swaps.
   */
  function syncSpreadIllustrationFromStory(opt) {
    opt = opt || {};
    if (!story) return;
    var n = numSpreads();
    if (n < 1) return;
    var si = spreadIndex;
    si = Math.max(0, Math.min(si, n - 1));
    var isTheEnd = si * 2 >= story.pages.length;
    var rightP = isTheEnd ? null : story.pages[si * 2 + 1];
    var leftP = isTheEnd ? null : story.pages[si * 2];
    var pLo = isTheEnd ? story.pages.length : (si * 2 + 1);
    var pHi = isTheEnd ? story.pages.length : (si * 2 + 2);
    var rawU = isTheEnd
      ? story.sceneImageUrl || ""
      : rightP && rightP.imageUrl
        ? String(rightP.imageUrl)
        : "";
    if (!rawU && !isTheEnd && leftP && leftP.imageUrl) {
      rawU = String(leftP.imageUrl);
    }
    var u = storyImageDisplayUrl(rawU);

    function imgAttrSrc(img) {
      return img ? img.getAttribute("src") || "" : "";
    }

    if (u) {
      clearArtFlyleaf();
      if (spreadInnerEl) {
        spreadInnerEl.classList.add("sb-flip-spread__inner--has-art");
      }
      var duplexCoverSrc = Object.prototype.hasOwnProperty.call(opt, "duplexCoverSrc")
        ? opt.duplexCoverSrc
        : u;
      var duplexChanged = false;
      var legacyChanged = false;
      if (spreadArtImg) {
        if (imgAttrSrc(spreadArtImg) !== u) {
          spreadArtImg.src = u;
          legacyChanged = true;
        }
        spreadArtImg.alt = isTheEnd ? "The End" : "Illustration for pages " + pLo + "–" + pHi;
        spreadArtImg.referrerPolicy = "no-referrer";
      }
      if (spreadArt) spreadArt.classList.remove("is-empty");
      if (spreadArtCover && duplexCoverSrc) {
        if (imgAttrSrc(spreadArtCover) !== duplexCoverSrc) {
          spreadArtCover.src = duplexCoverSrc;
          duplexChanged = true;
        }
        spreadArtCover.alt =
          isTheEnd ? "The End" : "Illustration for pages " + pLo + "–" + pHi + " of " + story.pages.length;
        spreadArtCover.referrerPolicy = "no-referrer";
        spreadArtCover.style.opacity = "";
        spreadArtCover.style.visibility = "";
      }
      if (spreadInnerEl && spreadInnerEl.dataset) {
        spreadInnerEl.dataset.sbArtUrl = u;
      }
      if (spreadArtNum) {
        spreadArtNum.textContent = isTheEnd ? "The End" : "Pages " + pLo + "–" + pHi + " of " + story.pages.length;
      }
      if (duplexChanged || legacyChanged) {
        nudgeDuplexArtComposite();
      }
    } else {
      var flyTxt =
        si === 0 &&
        !isTheEnd &&
        rightP &&
        rightP.text
          ? String(rightP.text).trim()
          : "";
      if (flyTxt && spreadArtFlyleaf) {
        if (spreadArtImg) spreadArtImg.removeAttribute("src");
        if (spreadArt) spreadArt.classList.add("is-empty");
        if (spreadArtBg) spreadArtBg.style.backgroundImage = "";
        if (spreadArtCover) {
          spreadArtCover.removeAttribute("src");
          spreadArtCover.alt = "";
          spreadArtCover.style.opacity = "";
          spreadArtCover.style.visibility = "";
        }
        if (spreadInnerEl && spreadInnerEl.dataset && spreadInnerEl.dataset.sbArtUrl) {
          delete spreadInnerEl.dataset.sbArtUrl;
        }
        if (spreadInnerEl) {
          spreadInnerEl.classList.remove("sb-flip-spread__inner--has-art");
          spreadInnerEl.classList.add("sb-flip-spread__inner--flyleaf-pane");
        }
        if (spreadArtNum) {
          spreadArtNum.textContent = "";
        }
        spreadArtFlyleaf.innerHTML =
          '<p class="sb-flip-text sb-flip-flyleaf-paragraph"><span class="sb-flip-text__highlight">' +
          storyPageTextToReadableHtml(flyTxt) +
          "</span></p>";
        bindReadableWordSpans(spreadArtFlyleaf);
        spreadArtFlyleaf.removeAttribute("hidden");
        spreadArtFlyleaf.hidden = false;
      } else {
        clearArtFlyleaf();
        if (spreadArtImg) spreadArtImg.removeAttribute("src");
        if (spreadArt) spreadArt.classList.add("is-empty");
        if (spreadArtBg) spreadArtBg.style.backgroundImage = "";
        if (spreadArtCover) {
          spreadArtCover.removeAttribute("src");
          spreadArtCover.alt = "";
          spreadArtCover.style.opacity = "";
          spreadArtCover.style.visibility = "";
        }
        if (spreadInnerEl && spreadInnerEl.dataset && spreadInnerEl.dataset.sbArtUrl) {
          delete spreadInnerEl.dataset.sbArtUrl;
        }
        if (spreadInnerEl) {
          spreadInnerEl.classList.remove("sb-flip-spread__inner--has-art");
        }
        if (spreadArtNum) {
          spreadArtNum.textContent = rightP ? "Drawing missing" : "";
        }
      }
    }
  }

  /**
   * @param {{ skipArt?: boolean }} opt  — skipArt defers `syncSpreadIllustrationFromStory` (page-turn path syncs art separately)
   */
  function applySpreadContent(opt) {
    opt = opt || {};
    if (!story || !spreadText) return;
    var n = numSpreads();
    if (n < 1) return;
    spreadIndex = Math.max(0, Math.min(spreadIndex, n - 1));
    writeSpreadTextMetaFromStory();
    if (!opt.skipArt) {
      syncSpreadIllustrationFromStory();
    }
    syncReaderFacingLayoutClasses();
    placeTextPageForFacingLayout();
    updateSpreadPageNumberDisplay();
    updatePagerHints();
  }

  function renderSpread() {
    applySpreadContent();
  }

  function updatePagerHints() {
    if (!story) return;
    var n = numSpreads();
    var si = spreadIndex;
    si = Math.max(0, Math.min(si, Math.max(0, n - 1)));
    if (spreadAnimLock) {
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      return;
    }
    if (book && book.classList.contains("sb-book--cover-visible")) {
      if (btnPrev) btnPrev.disabled = true;
      if (btnNext) btnNext.disabled = true;
      return;
    }
    if (btnPrev) btnPrev.disabled = si <= 0;
    if (btnNext) btnNext.disabled = si >= n - 1;
  }

  function goNextPage() {
    navigateSpread(1);
  }

  function goPrevPage() {
    navigateSpread(-1);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  /**
   * Remote hosts that often block direct browser fetch/CORS or cold-load inconsistently.
   * Load via clever-service GET `?url=` (same as DALL·E) so images encode for the shelf and show in the reader.
   */
  function storyImageNeedsEdgeProxy(url) {
    var u = String(url || "").toLowerCase();
    if (!u || u.indexOf("data:") === 0) return false;
    if (u.indexOf("/functions/v1/") !== -1 && u.indexOf("url=") !== -1) return false;
    return (
      u.indexOf("blob.core.windows.net") !== -1 ||
      u.indexOf("oaiusercontent.com") !== -1 ||
      u.indexOf("fal.media") !== -1 ||
      u.indexOf("fal-cdn") !== -1 ||
      u.indexOf(".r2.dev") !== -1
    );
  }

  /**
   * Shelf storage can skip canvas JPEG re-encode when the URL is a stable public asset
   * the browser loads at full quality (e.g. Supabase Storage). Proxied / ephemeral hosts
   * still use tryFetchImageDataUrl.
   */
  function shelfKeepOriginalRemoteUrl(url) {
    var u = String(url || "").trim().toLowerCase();
    if (!u || u.indexOf("data:") === 0) return false;
    if (storyImageNeedsEdgeProxy(url)) return false;
    if (
      u.indexOf(".supabase.co/") !== -1 &&
      u.indexOf("/storage/v1/object/public/") !== -1
    ) {
      return true;
    }
    return false;
  }

  /**
   * When true, persist only remote URL per page/scene — skip base64 blobs (IndexedDB quota).
   * Supabase public or signed URLs work in `<img>`; ephemeral hosts still encode via proxy.
   */
  function shelfPreferStoredUrlWithoutBlob(url) {
    if (shelfKeepOriginalRemoteUrl(url)) return true;
    var u = String(url || "").trim().toLowerCase();
    if (!u || u.indexOf("data:") === 0) return false;
    if (storyImageNeedsEdgeProxy(url)) return false;
    if (
      u.indexOf(".supabase.co/") !== -1 &&
      u.indexOf("/storage/v1/object/sign/") !== -1
    ) {
      return true;
    }
    return false;
  }

  function storyImageDisplayUrl(remoteUrl) {
    var u = String(remoteUrl || "").trim();
    if (!u) return u;
    if (u.indexOf("data:") === 0) return u;
    if (!storyImageNeedsEdgeProxy(u)) return u;
    var base = functionUrl();
    if (!base) return u;
    var key = anonKey();
    var out = base + "?url=" + encodeURIComponent(u);
    if (key) out += "&apikey=" + encodeURIComponent(key);
    return out;
  }

  function sanitizeFilename(raw) {
    var s = String(raw || "my-story-book")
      .trim()
      .replace(/[^\w\s\-']/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64)
      .toLowerCase();
    return s || "my-story-book";
  }

  /** @param {{ shelfCompress?: boolean }} [opts] — smaller JPEG for “Put on shelf” (keeps reopen via imageUrlFallback). */
  function tryFetchImageDataUrl(url, opts) {
    opts = opts || {};
    return Promise.resolve().then(function () {
      if (!url) return null;
      if (url.indexOf("data:") === 0) return url;
      
      // 1. First fetch the image using CORS fetch to get the raw Blob. 
      // Proxy DALL·E + Fal (and similar) through clever-service ?url= so CORS/shelf encoding works.
      var fetchUrl = url;
      var fUrl = functionUrl();
      var aKey = anonKey();
      var reqOpts = {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        cache: "default",
        referrerPolicy: "no-referrer",
      };

      if (fUrl && storyImageNeedsEdgeProxy(url)) {
        fetchUrl = storyImageDisplayUrl(url);
        if (aKey) {
          reqOpts.headers = {
            Authorization: "Bearer " + aKey,
            apikey: aKey,
          };
        }
      }

      return fetch(fetchUrl, reqOpts)
        .then(function (r) {
          if (!r.ok) throw new Error("bad " + r.status);
          return r.blob();
        })
        .then(function (blob) {
          // 2. Convert Blob to raw base64 data URL
          return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () {
              resolve(fr.result);
            };
            fr.onerror = function () {
              reject(new Error("read"));
            };
            fr.readAsDataURL(blob);
          });
        })
        .then(function (rawBase64) {
          // 3. Load the raw base64 data URL into an image to compress it.
          // Because it's a data: URL, there are zero CORS restrictions and canvas won't be tainted.
          return new Promise(function (resolve) {
            var img = new Image();
            // We set crossOrigin just in case the URL was NOT proxied and is a direct CDN link
            if (rawBase64.indexOf("data:") !== 0) {
              img.crossOrigin = "anonymous";
            }
            img.onload = function () {
              try {
                var canvas = document.createElement("canvas");
                /* Shelf blobs: minimise size — reader prefers imageUrlFallback when present. */
                var maxDim = opts.shelfCompress ? 520 : 1280;
                var jpegQuality = opts.shelfCompress ? 0.65 : 0.85;
                var w = img.width;
                var h = img.height;
                if (w > maxDim || h > maxDim) {
                  var ratio = w / h;
                  if (w > h) {
                    w = maxDim;
                    h = Math.round(maxDim / ratio);
                  } else {
                    h = maxDim;
                    w = Math.round(maxDim * ratio);
                  }
                }
                canvas.width = w || 1;
                canvas.height = h || 1;
                var ctx = canvas.getContext("2d");
                if (!ctx) throw new Error("No 2d context");
                ctx.drawImage(img, 0, 0, w, h);
                /* Higher than 0.55 — shelf reopen looked muddy; still JPEG for quota vs PNG */
                resolve(canvas.toDataURL("image/jpeg", jpegQuality));
              } catch (e) {
                console.warn("Canvas compression failed, falling back to original URL", e);
                resolve(url); // Fallback to original URL if compression fails
              }
            };
            img.onerror = function (e) {
              console.warn("Image element failed to load raw base64", e);
              resolve(url); // Fallback to original URL if image load fails
            };
            img.src = rawBase64;
          });
        });
    }).catch(function (err) {
      console.warn("Could not fetch data URL for", url, err);
      return url; // CRITICAL FIX: Always return the original URL if the proxy/fetch fails, never null!
    });
  }

  function fetchAllPageDataUrls() {
    if (!story || !story.pages.length) return Promise.resolve([]);
    return Promise.all(
      story.pages.map(function (p) {
        return tryFetchImageDataUrl(p.imageUrl || "");
      })
    );
  }

  /** Like fetchAllPageDataUrls but avoids re-encoding URLs already served at full quality (e.g. Supabase public). */
  function fetchShelfPageDataUrls() {
    if (!story || !story.pages.length) return Promise.resolve([]);
    return Promise.all(
      story.pages.map(function (p) {
        var u = p.imageUrl || "";
        if (shelfPreferStoredUrlWithoutBlob(u)) return Promise.resolve(null);
        return tryFetchImageDataUrl(u, { shelfCompress: true });
      })
    );
  }

  function fetchSceneDataUrlForShelf(sceneUrl) {
    if (!sceneUrl) return Promise.resolve(null);
    if (shelfPreferStoredUrlWithoutBlob(sceneUrl)) return Promise.resolve(null);
    return tryFetchImageDataUrl(sceneUrl, { shelfCompress: true });
  }

  /** Shelf size is bounded only by browser/IndexedDB quota — we never auto-delete stories to make room. */
  var SHELF_STORAGE_KEY = "jigsawKids_storybookShelf_v1";
  /** @type {Array|null} null until first hydrate from IndexedDB / localStorage */
  var shelfCache = null;

  function loadShelfSyncFromLocalStorage() {
    try {
      var raw = localStorage.getItem(SHELF_STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * If getJson/ready threw but shelf lives only in IndexedDB (localStorage cleared on migrate),
   * recover from raw string without losing the library.
   * @returns {Promise<void>}
   */
  function recoverShelfAfterStoreFailure(err) {
    console.warn("[storybook shelf] Store hydrate failed:", err);
    var lsList = loadShelfSyncFromLocalStorage();
    if (lsList.length > 0) {
      shelfCache = lsList;
      return Promise.resolve();
    }
    if (!window.StorybookShelfStore || typeof window.StorybookShelfStore.getRaw !== "function") {
      shelfCache = [];
      return Promise.resolve();
    }
    return window.StorybookShelfStore.getRaw().then(function (raw) {
      if (raw == null || !String(raw).length) {
        shelfCache = [];
        return;
      }
      try {
        var data = JSON.parse(String(raw));
        shelfCache = Array.isArray(data) ? data : [];
      } catch (parseErr) {
        console.warn("[storybook shelf] recover parse failed:", parseErr);
        shelfCache = [];
      }
    }).catch(function (e2) {
      console.warn("[storybook shelf] getRaw failed:", e2);
      shelfCache = [];
    });
  }

  function loadShelf() {
    if (shelfCache === null) {
      return loadShelfSyncFromLocalStorage();
    }
    return shelfCache;
  }

  /**
   * Refresh in-memory shelf from the same store the cloud merge uses (needed after pull).
   * @param {function(): void} [done]
   */
  function reloadShelfCacheFromStore(done) {
    if (window.StorybookShelfStore && typeof window.StorybookShelfStore.getJson === "function") {
      window.StorybookShelfStore.getJson()
        .then(function (list) {
          shelfCache = Array.isArray(list) ? list : [];
          if (done) {
            done();
          }
        })
        .catch(function (err) {
          recoverShelfAfterStoreFailure(err).then(function () {
            if (done) done();
          });
        });
    } else {
      shelfCache = loadShelfSyncFromLocalStorage();
      if (done) {
        done();
      }
    }
  }

  /**
   * @param {function(): void} [onWritten] after data is persisted and shelfCache updated
   */
  function saveShelf(list, cloudDone, onWritten) {
    cloudDone = typeof cloudDone === "function" ? cloudDone : null;
    onWritten = typeof onWritten === "function" ? onWritten : null;
    var tryList = list.slice();
    var raw;
    try {
      raw = JSON.stringify(tryList);
    } catch (stringifyErr) {
      console.warn("[storybook shelf] Could not serialize library:", stringifyErr);
      var serErr = new Error("shelf_serialize_failed");
      if (cloudDone) cloudDone(serErr);
      try {
        window.alert(
          "Could not save your library — the data could not be packed for storage.\n\n" +
            "Try again, or remove one book and retry.",
        );
      } catch (e) {}
      return;
    }

    function persistFail(e) {
      console.warn("[storybook shelf] Persist failed — no stories were removed automatically:", e);
      var err =
        e instanceof Error
          ? e
          : new Error(typeof e === "string" ? e : "storage_quota");
      if (cloudDone) cloudDone(err);
      try {
        window.alert(mergeFailedMessage(err.message || String(e)));
      } catch (e2) {}
    }

    function afterPersistOk(savedRaw) {
      shelfCache = tryList;
      if (onWritten) {
        onWritten();
      }
      if (window.KidsScoreCloud && window.KidsScoreCloud.scheduleStorybookUpload) {
        window.KidsScoreCloud.scheduleStorybookUpload(savedRaw, cloudDone);
      } else if (cloudDone) {
        cloudDone(null);
      }
    }

    if (window.StorybookShelfStore && typeof window.StorybookShelfStore.setRaw === "function") {
      window.StorybookShelfStore.setRaw(raw).then(
        function () {
          afterPersistOk(raw);
        },
        function (e) {
          persistFail(e);
        },
      );
      return;
    }
    try {
      localStorage.setItem(SHELF_STORAGE_KEY, raw);
      afterPersistOk(raw);
    } catch (e) {
      persistFail(e);
    }
  }

  function hashFromString(str) {
    var h = 2166136261;
    var s = String(str || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function spineMeta(bookId, title, bookColor) {
    var h = hashFromString(bookId + ":" + title);
    var hue = h % 360;
    var c = bookColor ? String(bookColor).toLowerCase() : "";
    if (c.indexOf("navy") !== -1) hue = 222 + (h % 18);
    else if (c.indexOf("teal") !== -1) hue = 175 + (h % 20);
    else if (c.indexOf("mint") !== -1) hue = 145 + (h % 22);
    else if (c.indexOf("green") !== -1) hue = 120 + (h % 40);
    else if (c.indexOf("blue") !== -1) hue = 200 + (h % 40);
    else if (c.indexOf("lilac") !== -1) hue = 265 + (h % 25);
    else if (c.indexOf("purple") !== -1) hue = 275 + (h % 30);
    else if (c.indexOf("coral") !== -1) hue = 350 + (h % 12);
    else if (c.indexOf("pink") !== -1) hue = 320 + (h % 30);
    else if (c.indexOf("red") !== -1) hue = 5 + (h % 18);
    else if (c.indexOf("orange") !== -1) hue = 28 + (h % 18);
    else if (c.indexOf("yellow") !== -1) hue = 48 + (h % 14);
    return {
      hue: hue,
      pat: h % 4,
      hPx: 112 + (h % 40),
      wPx: 21 + (h % 16),
    };
  }

  function spineLabel(title) {
    var t = String(title || "Story").trim();
    if (t.length > 44) return t.slice(0, 42) + "…";
    return t;
  }

  function addStoryToShelfFromData(
    title,
    author,
    pages,
    dataUrls,
    sceneDataUrl,
    sceneUrlFallback,
    bookColor,
    readerFont,
    readerArtLayout,
    storyTextMode,
    storyLength,
    cloudDone,
    onWritten
  ) {
    var list = loadShelf();
    var id = "b" + Date.now() + "-" + ((Math.random() * 1e6) | 0);
    var storedPages = pages.map(function (p, i) {
      var fb = String(p.imageUrl || "").trim();
      var inline = dataUrls[i] || null;
      if (fb && shelfPreferStoredUrlWithoutBlob(fb)) inline = null;
      return {
        text: p.text,
        imageDataUrl: inline,
        imageUrlFallback: p.imageUrl || null,
      };
    });
    var storedSceneData = sceneDataUrl || null;
    var sf = String(sceneUrlFallback || "").trim();
    if (sf && shelfPreferStoredUrlWithoutBlob(sf)) storedSceneData = null;
    list.unshift({
      id: id,
      title: title,
      author: author || "",
      bookColor: bookColor || null,
      readerFont: readerFont || null,
      readerArtLayout: readerArtLayout === "facing" ? "facing" : "duplex",
      storyTextMode: storyTextMode === "prose" ? "prose" : "rhyme",
      storyLength: coerceStoryLengthKey(storyLength),
      savedAt: new Date().toISOString(),
      pages: storedPages,
      sceneDataUrl: storedSceneData,
      sceneUrlFallback: sceneUrlFallback || null,
    });
    saveShelf(list, cloudDone, onWritten);
  }

  function removeShelfBook(bookId) {
    var list = loadShelf().filter(function (b) {
      return b.id !== bookId;
    });
    saveShelf(list, null, function () {
    renderShelf();
    });
  }

  function openShelfBook(bookId) {
    var list = loadShelf();
    var item = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === bookId) {
        item = list[i];
        break;
      }
    }
    if (!item || !item.pages || !item.pages.length) return;
    story = {
      title: item.title,
      author: item.author || "",
      bookColor: item.bookColor || null,
      readerFont: item.readerFont || null,
      readerArtLayout:
        item.readerArtLayout === "facing" ? "facing" : "duplex",
      storyTextMode: storyTextModeFromShelfItem(
        item,
        item.readerArtLayout === "facing" ? "facing" : "duplex"
      ),
      storyLength: storyLengthFromShelfItem(item),
      /* Prefer remote asset when present so reopen matches stored PNG (not shelf JPEG). */
      sceneImageUrl: item.sceneUrlFallback || item.sceneDataUrl || null,
      pages: item.pages.map(function (p) {
        return {
          text: p.text,
          imageUrl: p.imageUrlFallback || p.imageDataUrl || null,
        };
      }),
    };
    spreadIndex = 0;
    showBook();
  }

  /**
   * First illustration on the shelf cover (persisted base64 wins over remote CDN URL).
   * @returns {{ src: string, pageIndex: number }}
   */
  function firstShelfCoverMeta(item) {
    if (item.sceneUrlFallback || item.sceneDataUrl) {
      return { src: item.sceneUrlFallback || item.sceneDataUrl, pageIndex: -1 };
    }
    if (!item.pages || !item.pages.length) return { src: "", pageIndex: -1 };
    for (var i = 0; i < item.pages.length; i++) {
      var p = item.pages[i];
      var du = String(p.imageDataUrl || "").trim();
      var hu = String(p.imageUrlFallback || "").trim();
      var src = hu || du;
      if (src) return { src: src, pageIndex: i };
    }
    return { src: "", pageIndex: -1 };
  }

  function persistShelfPageDataUrl(bookId, pageIdx, dataUrl) {
    var list = loadShelf();
    for (var bi = 0; bi < list.length; bi++) {
      if (list[bi].id !== bookId) continue;
      var pages = list[bi].pages;
      if (!pages || !pages[pageIdx]) continue;
      pages[pageIdx].imageDataUrl = dataUrl;
      saveShelf(list);
      break;
    }
  }

  var SHELF_COVERS_PER_TIER = 4;

  /** Flat portrait “app cover” tile for My library (spine, framed art, title, TAP TO OPEN). */
  function wrapShelfCoverLibraryFlat(face) {
    var scene = document.createElement("span");
    scene.className = "sb-cover-card__scene sb-cover-card__scene--library-flat";
    scene.appendChild(face);
    return scene;
  }

  function composeLibraryShelfFace(face, meta, rawTitle, imgElOpt) {
    var titleShown = spineLabel(rawTitle);
    face.textContent = "";
    var root = document.createElement("span");
    root.className = "sb-library-cover";

    var spine = document.createElement("span");
    spine.className = "sb-library-cover__spine";
    spine.setAttribute("aria-hidden", "true");
    spine.style.setProperty("--sb-h", String(meta.hue));

    var panel = document.createElement("span");
    panel.className = "sb-library-cover__panel";

    if (imgElOpt) {
      panel.appendChild(imgElOpt);
    } else {
      var ph = document.createElement("span");
      ph.className = "sb-library-cover__placeholder-bg";
      ph.setAttribute("aria-hidden", "true");
      ph.style.setProperty("--sb-h", String(meta.hue));
      panel.appendChild(ph);
    }

    var tint = document.createElement("span");
    tint.className = "sb-library-cover__tint";
    tint.setAttribute("aria-hidden", "true");
    tint.style.setProperty("--sb-h", String(meta.hue));
    panel.appendChild(tint);

    var frame = document.createElement("span");
    frame.className = "sb-library-cover__frame";
    frame.setAttribute("aria-hidden", "true");
    panel.appendChild(frame);

    var titles = document.createElement("span");
    titles.className = "sb-library-cover__titles";

    var spark = document.createElement("span");
    spark.className = "sb-library-cover__sparkle-icon";
    spark.setAttribute("aria-hidden", "true");
    spark.textContent = "\u2726";

    var tit = document.createElement("span");
    tit.className = "sb-library-cover__title";
    tit.textContent = titleShown;

    var tap = document.createElement("span");
    tap.className = "sb-library-cover__tap";
    tap.textContent = "TAP TO OPEN";

    titles.appendChild(spark);
    titles.appendChild(tit);
    titles.appendChild(tap);
    panel.appendChild(titles);

    root.appendChild(spine);
    root.appendChild(panel);
    face.appendChild(root);
  }

  function createCoverCardWrap(item) {
    var meta = spineMeta(item.id, item.title, item.bookColor);
    var cover = firstShelfCoverMeta(item);
    var coverSrc = cover.src;
    var pageIdxCover = cover.pageIndex;
    var wrap = document.createElement("div");
    wrap.className = "sb-cover-card-wrap";
    var openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className =
      "sb-cover-card sb-cover-card--library-preview" +
      (coverSrc ? " sb-cover-card--has-art" : " sb-cover-card--placeholder");
    openBtn.style.setProperty("--sb-h", String(meta.hue));
    openBtn.setAttribute("role", "listitem");
    openBtn.setAttribute("aria-label", "Open book: " + item.title);
    var face = document.createElement("span");
    face.className = "sb-cover-card__face";

    function finishCoverFallback() {
      openBtn.className =
        "sb-cover-card sb-cover-card--library-preview sb-cover-card--placeholder";
      openBtn.style.setProperty("--sb-h", String(meta.hue));
      composeLibraryShelfFace(face, meta, item.title, null);
    }

    if (coverSrc) {
      var img = document.createElement("img");
      img.src = coverSrc;
      img.alt = "";
      img.decoding = "async";
      img.loading = "lazy";
      img.className = "sb-cover-card__thumb-bg sb-library-cover__img";
      img.referrerPolicy = "no-referrer";
      var retriedCover = false;
      img.onerror = function () {
        var pg = pageIdxCover >= 0 && item.pages ? item.pages[pageIdxCover] : null;
        var remoteFallback = pg && String(pg.imageUrlFallback || "").trim();

        if (!retriedCover && pg && remoteFallback && /^https?:\/\//i.test(remoteFallback)) {
          retriedCover = true;
            tryFetchImageDataUrl(remoteFallback, { shelfCompress: true })
            .then(function (dataUrl) {
              if (dataUrl && String(dataUrl).indexOf("data:") === 0) {
                persistShelfPageDataUrl(item.id, pageIdxCover, dataUrl);
                img.src = dataUrl;
                return;
              }
              finishCoverFallback();
            })
            .catch(function () {
              finishCoverFallback();
            });
          return;
        }
        finishCoverFallback();
      };
      composeLibraryShelfFace(face, meta, item.title, img);
    } else {
      composeLibraryShelfFace(face, meta, item.title, null);
    }

    openBtn.appendChild(wrapShelfCoverLibraryFlat(face));
    openBtn.addEventListener("click", function () {
      openShelfBook(item.id);
    });
    var rm = document.createElement("button");
    rm.type = "button";
    rm.className = "sb-shelf-remove";
    rm.setAttribute("aria-label", "Remove from shelf: " + item.title);
    rm.textContent = "×";
    rm.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (window.confirm('Remove "' + item.title + '" from your shelf?')) {
      removeShelfBook(item.id);
      }
    });
    wrap.appendChild(openBtn);
    wrap.appendChild(rm);
    return wrap;
  }

  function renderShelf() {
    if (!shelfEl) return;
    shelfEl.textContent = "";
    var list = loadShelf();
    if (!list.length) {
      shelfEl.classList.remove("sb-shelf-has-books");
      var empty = document.createElement("p");
      empty.className = "sb-library__empty";
      empty.textContent =
        "No books on the shelf yet. When you finish a story, tap “Put on my shelf”.";
      shelfEl.appendChild(empty);
      updateCarouselButtons();
      return;
    }

    shelfEl.classList.add("sb-shelf-has-books");
    for (var i = 0; i < list.length; i++) {
      shelfEl.appendChild(createCoverCardWrap(list[i]));
    }
    updateCarouselButtons();
  }

  function updateCarouselButtons() {
    var prevBtn = document.getElementById("sbCarouselPrev");
    var nextBtn = document.getElementById("sbCarouselNext");
    if (!prevBtn || !nextBtn || !shelfEl) return;

    /* My library is a vertical scroll grid — carousel arrows unused. */
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    prevBtn.setAttribute("aria-hidden", "true");
    nextBtn.setAttribute("aria-hidden", "true");
  }

  function scrollCarousel(dir) {
    if (!shelfEl) return;
    // Scroll by one full page
    // Add 20px for the gap between pages to ensure it crosses the snap threshold
    var gap = 20;
    var amount = (shelfEl.clientWidth + gap) * dir;
    shelfEl.scrollBy({ left: amount, behavior: "smooth" });
  }

  function saveBookToShelf() {
    if (!story || !story.pages.length || !btnShelf) return;
    var label = btnShelf.textContent;
    btnShelf.disabled = true;
    btnShelf.textContent = "Saving…";
    fetchShelfPageDataUrls()
      .then(function (dataUrls) {
        return fetchSceneDataUrlForShelf(story.sceneImageUrl || "").then(function (sceneData) {
          return { dataUrls: dataUrls, sceneData: sceneData };
        });
      })
      .then(function (o) {
        try {
          addStoryToShelfFromData(
            story.title,
            story.author,
            story.pages,
            o.dataUrls,
            o.sceneData,
            story.sceneImageUrl || null,
            story.bookColor || null,
            story.readerFont || null,
            story.readerArtLayout || "duplex",
            story.storyTextMode === "prose" || story.storyTextMode === "rhyme"
              ? story.storyTextMode
              : story.readerArtLayout === "facing"
                ? "prose"
                : "rhyme",
            story.storyLength === "short" ||
            story.storyLength === "medium" ||
            story.storyLength === "long"
              ? story.storyLength
              : "medium",
            function (cloudErr) {
              if (
                !window.KidsScoreCloud ||
                !window.KidsScoreCloud.isConfigured ||
                !window.KidsScoreCloud.isConfigured()
              ) {
                return;
              }
              var hintEl = document.getElementById("sbLibraryHint");
              var defaultHint =
                (hintEl && hintEl.getAttribute("data-default-hint")) ||
                "Put a book on the shelf after you read it — tap a cover to open it again.";
              if (hintEl && !hintEl.getAttribute("data-default-hint")) {
                hintEl.setAttribute("data-default-hint", hintEl.textContent.trim() || defaultHint);
              }
              if (!cloudErr) {
                if (hintEl) {
                  hintEl.textContent =
                    "Saved on this device and backed up to the cloud. Use the same family password on other devices, then “Get latest books from cloud”.";
                  window.setTimeout(function () {
                    if (hintEl) {
                      hintEl.textContent =
                        hintEl.getAttribute("data-default-hint") || defaultHint;
                    }
                  }, 12000);
                }
                return;
              }
              var msg = cloudErr && cloudErr.message ? String(cloudErr.message) : String(cloudErr);
              /* Local persist failed — saveShelf already alerted; do not imply “saved on device”. */
              if (
                msg === "storage_quota" ||
                msg === "localStorage_quota" ||
                msg === "shelf_serialize_failed" ||
                /quota|QuotaExceeded/i.test(msg)
              ) {
                return;
              }
              if (msg === "no_session") {
                window.alert(
                  "This tablet saved the book only on itself — it did not reach the cloud.\n\nOpen ⚙️ (bottom corner) → Sign in with your family password → tap “Put on my shelf” again.\n\n(Deploying edge functions does not update shelf sync — the website’s JavaScript does.)",
                );
              } else {
                window.alert(
                  "Saved on this device, but cloud backup failed:\n\n" +
                    msg +
                    "\n\nIf this keeps happening, ask a grown-up to check saved books in your account storage."
                );
              }
              if (hintEl) {
                hintEl.textContent =
                  "Cloud backup failed — see the message above. Books are still on this device.";
                window.setTimeout(function () {
                  if (hintEl) {
                    hintEl.textContent =
                      hintEl.getAttribute("data-default-hint") || defaultHint;
                  }
                }, 14000);
              }
            },
            function () {
          renderShelf();
            },
          );
        } catch (e) {
          window.alert("Couldn’t save — storage might be full. Try downloading instead.");
        }
      })
      .catch(function () {
        window.alert("Couldn’t prepare pictures for the shelf. Try again.");
      })
      .finally(function () {
        btnShelf.disabled = false;
        btnShelf.textContent = label;
      });
  }

  function buildStandaloneBookHtml(title, author, pages, dataUrls, sceneDataUrl, readerFont) {
    var rf = normalizeReaderFontKey(readerFont);
    var preset = SB_READER_FONT_PRESETS[rf];
    var escTitle = escapeHtml(title);
    var escAuthor = author ? escapeHtml(author) : "";
    var authorHtml = escAuthor ? '<p class="sbdl-cover-author">' + escAuthor + '</p>' : '';
    var bodyRule =
      "body{font-family:" +
      preset.body +
      ";margin:0;background:linear-gradient(165deg,#fce7f3,#fdf2f8 45%,#e9d5ff);color:#500724}";
    var articles = [];
    
    if (sceneDataUrl) {
      articles.push(
        '<div class="sbdl-spread sbdl-spread--cover">' +
          '<img class="sbdl-cover-img" src="' + sceneDataUrl + '" alt="Cover" />' +
          '<div class="sbdl-cover-title-wrap"><h1 class="sbdl-cover-title">' + escTitle + '</h1>' + authorHtml + '</div>' +
        '</div>'
      );
    } else {
      articles.push('<h1>' + escTitle + '</h1>' + authorHtml);
    }

    for (var i = 0; i < pages.length; i += 2) {
      var leftPage = pages[i];
      var rightPage = pages[i + 1] || null;
      
      var leftContent = '<div class="sbdl-side sbdl-side--left">' +
        '<p class="sbdl-t">' + escapeHtml(leftPage.text).replace(/\n/g, "<br/>") + '</p>' +
        '<p class="sbdl-k">Page ' + (i + 1) + '</p>' +
      '</div>';
      
      var rightContent = '<div class="sbdl-side sbdl-side--right">';
      if (rightPage) {
         if (rightPage.imageUrl) {
            var src = dataUrls[i + 1] || escapeAttr(rightPage.imageUrl);
            rightContent += '<div class="sbdl-art"><img src="' + src + '" alt="Illustration for page ' + (i + 2) + '" /></div>';
         }
         rightContent += '<p class="sbdl-t">' + escapeHtml(rightPage.text).replace(/\n/g, "<br/>") + '</p>';
         rightContent += '<p class="sbdl-k">Page ' + (i + 2) + '</p>';
      }
      rightContent += '</div>';

      articles.push(
        '<div class="sbdl-spread">' +
          leftContent +
          rightContent +
        '</div>'
      );
    }

    var css =
      bodyRule +
      ".sbdl-wrap{max-width:54rem;margin:0 auto;padding:1.5rem 1rem 3rem}" +
      "h1{font-size:clamp(1.35rem,4vw,1.65rem);text-align:center;color:#9d174d;margin:0 0 1.25rem;font-weight:800;}" +
      ".sbdl-spread{display:flex;flex-direction:column;gap:1.5rem;background:#fff;border-radius:24px;padding:1.5rem;margin:0 0 2rem;box-shadow:0 8px 32px rgba(157,23,77,.08);border:2px solid rgba(244,114,182,.3);}" +
      "@media(min-width:768px){.sbdl-spread{flex-direction:row;padding:2.5rem;gap:3rem;}}" +
      ".sbdl-side{flex:1;display:flex;flex-direction:column;}" +
      ".sbdl-k{font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#be185d;margin-top:auto;padding-top:1.5rem;text-align:center;opacity:0.6;}" +
      ".sbdl-art{border-radius:16px;overflow:hidden;margin:0 0 1.25rem;background:#fdf2f8;box-shadow:0 4px 16px rgba(0,0,0,0.06);}" +
      ".sbdl-art img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;transform:scale(1.02);}" +
      ".sbdl-t{font-size:1.25rem;font-weight:600;line-height:1.65;margin:0;color:#500724;font-family:" +
      preset.body +
      ";}" +
      ".sbdl-spread--cover{position:relative;padding:0;overflow:hidden;border:none;box-shadow:0 12px 40px rgba(157,23,77,.2);}" +
      "@media(min-width:768px){.sbdl-spread--cover{padding:0;}}" +
      ".sbdl-cover-img{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:cover;transform:scale(1.02);}" +
      ".sbdl-cover-title-wrap{position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;}" +
      ".sbdl-cover-title{font-size:clamp(2.5rem,8vw,4rem);color:#fff;text-shadow:0 4px 24px rgba(0,0,0,0.6);margin:0;text-align:center;}" +
      ".sbdl-cover-author{font-size:clamp(1.2rem,4vw,1.8rem);color:#fff;text-shadow:0 2px 12px rgba(0,0,0,0.6);margin:1rem 0 0;text-align:center;font-weight:600;}" +
      ".sbdl-foot{margin-top:2.5rem;font-size:.85rem;font-weight:700;color:#9f1239;text-align:center;line-height:1.5;opacity:0.8;}" +
      "@media print{.sbdl-spread{break-inside:avoid;flex-direction:row;padding:2rem;gap:2rem;}}";

    return (
      '<!DOCTYPE html><html lang="en-GB"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin=""/><link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&amp;family=Comic+Neue:wght@400;700&amp;family=Fredoka:wght@400;500;600;700&amp;family=Kalam:wght@400;700&amp;family=Nunito:wght@600;700;800&amp;family=Patrick+Hand&amp;family=Schoolbell&amp;family=Sniglet:wght@400;800&amp;display=swap" rel="stylesheet"/><title>' +
      escTitle +
      "</title><style>" +
      css +
      '</style></head><body><div class="sbdl-wrap">' +
      articles.join("") +
      '<p class="sbdl-foot">Saved from your Sofia&rsquo;s Game Room storybook. Keep this file to read your story any time!</p></div></body></html>'
    );
  }

  function downloadStoryBook() {
    if (!story || !story.pages.length || !btnDownload) return;
    var origLabel = btnDownload.textContent;
    btnDownload.disabled = true;
    btnDownload.textContent = "Preparing…";
    Promise.all([
      fetchAllPageDataUrls(),
      tryFetchImageDataUrl(story.sceneImageUrl || ""),
    ])
      .then(function (arr) {
        var html = buildStandaloneBookHtml(
          story.title,
          story.author,
          story.pages,
          arr[0],
          arr[1],
          story.readerFont
        );
        var blob = new Blob([html], { type: "text/html;charset=utf-8" });
        var u = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = u;
        a.download = sanitizeFilename(story.title) + ".html";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(u);
      })
      .catch(function () {
        window.alert("Couldn’t build the file. Try again in a moment.");
      })
      .finally(function () {
        btnDownload.disabled = false;
        btnDownload.textContent = origLabel;
      });
  }

  function heroFirstToken() {
    var n = nameInput && nameInput.value.trim() ? nameInput.value.trim() : "";
    var first = (n.split(/\s+/)[0] || "").replace(/[^a-z]/gi, "");
    return first.toLowerCase();
  }

  function syncHeroRefDatalist() {
    if (!heroRefDatalist) return;
    heroRefDatalist.replaceChildren();
    var heroLab = nameInput && nameInput.value.trim()
      ? nameInput.value.trim()
      : "Hero";
    var oHero = document.createElement("option");
    oHero.value = heroLab;
    heroRefDatalist.appendChild(oHero);
    var list =
      typeof window.KidsGameCharacters !== "undefined" &&
      Array.isArray(window.KidsGameCharacters)
        ? window.KidsGameCharacters
        : [];
    list.forEach(function (item) {
      if (!item || !item.label) return;
      var o = document.createElement("option");
      o.value = item.label;
      heroRefDatalist.appendChild(o);
    });
  }

  function displayNameForWho(who) {
    if (who === "hero") {
      return nameInput && nameInput.value.trim()
        ? nameInput.value.trim()
        : "Hero";
    }
    var list =
      typeof window.KidsGameCharacters !== "undefined" &&
      Array.isArray(window.KidsGameCharacters)
        ? window.KidsGameCharacters
        : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === who) return list[i].label;
    }
    if (who && /^[a-z0-9]+$/i.test(String(who))) {
      var s = String(who);
      return s.charAt(0).toUpperCase() + s.slice(1);
    }
    return who || "Friend";
  }

  /** @returns {"hero"|string|null} */
  function resolveWhoFromText(raw) {
    var t = (raw || "").trim();
    if (!t.length) return "hero";
    var tLo = t.toLowerCase();
    var tNorm = tLo.replace(/[^a-z0-9]/gu, "");

    if (!tNorm || tNorm === "hero" || tNorm === "me") return "hero";
    if (/\(\s*hero\s*\)/i.test(t)) return "hero";

    var heroName = nameInput && nameInput.value.trim()
      ? nameInput.value.trim()
      : "";
    if (heroName && tLo === heroName.toLowerCase()) return "hero";

    var hf = heroFirstToken();
    if (hf && tNorm === hf) return "hero";

    var list =
      typeof window.KidsGameCharacters !== "undefined" &&
      Array.isArray(window.KidsGameCharacters)
        ? window.KidsGameCharacters
        : [];
    for (var j = 0; j < list.length; j++) {
      var item = list[j];
      if (!item || !item.id) continue;
      if (item.id === tNorm || item.label.trim().toLowerCase() === tLo) {
        return item.id;
      }
    }
    if (tNorm.length >= 2 && tNorm.length <= 24 && /^[a-z0-9]+$/i.test(tNorm)) {
      return tNorm.toLowerCase();
    }
    return null;
  }

  function normalizeWhoInput(idx, inp) {
    if (!inp || idx < 0 || idx >= heroPhotoItems.length) return;
    setHeroPhotoError("");
    var prev = heroPhotoItems[idx].who;
    var r = resolveWhoFromText(inp.value);
    if (r === null) {
      setHeroPhotoError(
        "Use the hero’s name or a short friend name (letters and numbers only).",
      );
      heroPhotoItems[idx].who = prev;
      inp.value = displayNameForWho(prev);
      return;
    }
    heroPhotoItems[idx].who = r;
    inp.value = displayNameForWho(r);
  }

  function hideHeroPhotoNameOverlayUi() {
    if (heroPhotoNameOverlay) {
      heroPhotoNameOverlay.classList.add("is-hidden");
      heroPhotoNameOverlay.setAttribute("aria-hidden", "true");
    }
    setHeroPhotoNameInlineErr("");
    setHeroPhotoNameVoiceHint("");
  }

  function abortHeroPhotoNamePrompt() {
    heroPhotoPromptIndices = [];
    heroPhotoPromptAt = 0;
    stopSpeech({ preserveVoiceHints: true });
    hideHeroPhotoNameOverlayUi();
  }

  function closeHeroPhotoNamePromptSequence() {
    heroPhotoPromptIndices = [];
    heroPhotoPromptAt = 0;
    hideHeroPhotoNameOverlayUi();
  }

  function applyHeroPhotoWhoAtPrompt(idx, raw) {
    setHeroPhotoNameInlineErr("");
    var r = resolveWhoFromText(raw);
    if (r === null) {
      setHeroPhotoNameInlineErr("Try a short name with letters — like Ava or Jack.");
      return false;
    }
    heroPhotoItems[idx].who = r;
    return true;
  }

  function advanceHeroPhotoNamePromptAfterSuccess() {
    heroPhotoPromptAt += 1;
    if (heroPhotoPromptAt >= heroPhotoPromptIndices.length) {
      closeHeroPhotoNamePromptSequence();
      renderHeroPhotoThumbs();
      return;
    }
    paintHeroPhotoNamePromptStep();
  }

  function paintHeroPhotoNamePromptStep() {
    if (
      !heroPhotoNameOverlay ||
      !heroPhotoNameInput ||
      !heroPhotoNameThumb ||
      !heroPhotoNameLead
    ) {
      closeHeroPhotoNamePromptSequence();
      return;
    }
    if (heroPhotoPromptAt >= heroPhotoPromptIndices.length) {
      closeHeroPhotoNamePromptSequence();
      renderHeroPhotoThumbs();
      return;
    }
    var idxPaint = heroPhotoPromptIndices[heroPhotoPromptAt];
    if (idxPaint < 0 || idxPaint >= heroPhotoItems.length) {
      closeHeroPhotoNamePromptSequence();
      renderHeroPhotoThumbs();
      return;
    }
    heroPhotoNameOverlay.classList.remove("is-hidden");
    heroPhotoNameOverlay.setAttribute("aria-hidden", "false");
    heroPhotoNameThumb.src = heroPhotoItems[idxPaint].dataUrl;
    heroPhotoNameThumb.alt = "Picture you added for your book";

    var totalP = heroPhotoPromptIndices.length;
    var nP = heroPhotoPromptAt + 1;
    heroPhotoNameLead.textContent =
      totalP > 1
        ? "Picture " + nP + " of " + totalP + " — who's in this one?"
        : "Who is in this picture? Tap Done when it looks right.";

    heroPhotoNameInput.value = displayNameForWho(heroPhotoItems[idxPaint].who);
    setHeroPhotoNameInlineErr("");

    var myNamePaint =
      nameInput && nameInput.value.trim() ? nameInput.value.trim() : "";
    if (btnHeroPhotoNameMe) {
      btnHeroPhotoNameMe.classList.toggle("is-hidden", !myNamePaint);
    }

    window.requestAnimationFrame(function () {
      try {
        heroPhotoNameInput.focus();
        heroPhotoNameInput.select();
      } catch (eFocusHp) {}
    });
  }

  function beginHeroPhotoNamePromptForNewIndices(newIdxs) {
    if (!newIdxs || !newIdxs.length) {
      renderHeroPhotoThumbs();
      return;
    }
    if (!heroPhotoNameOverlay) {
      renderHeroPhotoThumbs();
      return;
    }
    stopSpeech({ preserveVoiceHints: true });
    setHeroPhotoNameInlineErr("");
    setHeroPhotoNameVoiceHint("");
    heroPhotoPromptIndices = newIdxs.slice();
    heroPhotoPromptAt = 0;
    renderHeroPhotoThumbs();
    paintHeroPhotoNamePromptStep();
  }

  function onHeroPhotoNameDoneClick() {
    if (!heroPhotoPromptIndices.length || heroPhotoPromptAt >= heroPhotoPromptIndices.length) {
      closeHeroPhotoNamePromptSequence();
      renderHeroPhotoThumbs();
      return;
    }
    var idxDone = heroPhotoPromptIndices[heroPhotoPromptAt];
    if (idxDone < 0 || idxDone >= heroPhotoItems.length) {
      closeHeroPhotoNamePromptSequence();
      renderHeroPhotoThumbs();
      return;
    }
    if (!heroPhotoNameInput) return;
    if (!applyHeroPhotoWhoAtPrompt(idxDone, heroPhotoNameInput.value)) return;
    advanceHeroPhotoNamePromptAfterSuccess();
  }

  function onHeroPhotoNameMeClick() {
    if (!heroPhotoPromptIndices.length || heroPhotoPromptAt >= heroPhotoPromptIndices.length) {
      closeHeroPhotoNamePromptSequence();
      renderHeroPhotoThumbs();
      return;
    }
    var idxMe = heroPhotoPromptIndices[heroPhotoPromptAt];
    if (idxMe < 0 || idxMe >= heroPhotoItems.length) {
      closeHeroPhotoNamePromptSequence();
      renderHeroPhotoThumbs();
      return;
    }
    heroPhotoItems[idxMe].who = "hero";
    setHeroPhotoNameInlineErr("");
    advanceHeroPhotoNamePromptAfterSuccess();
  }

  function renderHeroPhotoThumbs() {
    if (!heroPhotoThumbsList || !heroPhotoThumbsWrap) return;
    syncHeroRefDatalist();
    heroPhotoThumbsList.replaceChildren();
    heroPhotoItems.forEach(function (item, idx) {
      var li = document.createElement("li");
      li.className = "sb-hero-ref__thumb-item";
      li.setAttribute("data-idx", String(idx));
      var wrap = document.createElement("div");
      wrap.className = "sb-hero-ref__thumb-wrap";
      var img = document.createElement("img");
      img.className = "sb-hero-ref__thumb";
      img.src = item.dataUrl;
      img.alt = "Photo " + (idx + 1);
      img.width = 96;
      img.height = 96;
      img.decoding = "async";
      var inp = document.createElement("input");
      inp.type = "text";
      inp.className = "sb-hero-ref__who-input";
      inp.setAttribute("list", "sbHeroRefWhoDatalist");
      inp.setAttribute("autocomplete", "off");
      inp.setAttribute("aria-label", "Who is in this photo — type a name");
      inp.setAttribute("maxlength", "48");
      inp.value = displayNameForWho(item.who);
      inp.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          inp.blur();
        }
      });
      inp.addEventListener("focusout", function () {
        normalizeWhoInput(idx, inp);
      });
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sb-hero-ref__thumb-remove";
      btn.setAttribute("aria-label", "Remove this photo");
      btn.setAttribute("data-idx", String(idx));
      btn.textContent = "\u00d7";
      wrap.appendChild(img);
      wrap.appendChild(btn);
      li.appendChild(wrap);
      li.appendChild(inp);
      heroPhotoThumbsList.appendChild(li);
    });
    heroPhotoThumbsWrap.hidden = heroPhotoItems.length === 0;
  }

  function clearHeroPhoto() {
    abortHeroPhotoNamePrompt();
    heroPhotoItems = [];
    if (heroPhotoInput) heroPhotoInput.value = "";
    renderHeroPhotoThumbs();
    if (heroPhotoErr) {
      heroPhotoErr.textContent = "";
      heroPhotoErr.hidden = true;
    }
  }

  function setHeroPhotoError(msg) {
    if (!heroPhotoErr) return;
    if (msg) {
      heroPhotoErr.textContent = msg;
      heroPhotoErr.hidden = false;
    } else {
      heroPhotoErr.textContent = "";
      heroPhotoErr.hidden = true;
    }
  }

  function setError(msg) {
    if (!msg) {
      if (errEl) {
        errEl.hidden = true;
        errEl.textContent = "";
      }
      if (modalErr) {
        modalErr.hidden = true;
        modalErr.textContent = "";
      }
      return;
    }
    var onModal = modal && !modal.hidden;
    if (errEl) {
      errEl.hidden = onModal;
      if (!onModal) errEl.textContent = msg;
      else errEl.textContent = "";
    }
    if (modalErr) {
      modalErr.hidden = !onModal;
      if (onModal) modalErr.textContent = msg;
      else modalErr.textContent = "";
    }
  }

  function storybookSlug(c) {
    var def = "clever-service";
    if (!c || !c.storybookEdgeSlug) return def;
    var s = String(c.storybookEdgeSlug).trim().replace(/^\/+|\/+$/g, "");
    if (!s) return def;
    var safe = s.replace(/[^a-zA-Z0-9\-_]/g, "");
    return safe || def;
  }

  function functionUrl() {
    var c =
      typeof window.SCORE_CONFIG !== "undefined"
        ? window.SCORE_CONFIG
        : typeof window.SCORE_SYNC !== "undefined"
          ? window.SCORE_SYNC
          : null;
    var base = c && c.supabaseUrl ? String(c.supabaseUrl).replace(/\/$/, "") : "";
    if (!base) return "";
    return base + "/functions/v1/" + storybookSlug(c);
  }

  /** Skip these as “first word” when guessing narrator voice from book title. */
  var TTS_TITLE_SKIP = {
    the: 1, a: 1, an: 1, my: 1, our: 1, your: 1, little: 1, big: 1, great: 1, dear: 1, tiny: 1,
    brave: 1, wonderful: 1, amazing: 1, first: 1, last: 1, super: 1, happy: 1, silly: 1, true: 1,
    another: 1, some: 1,
  };

  function firstTokenFromTitleish(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    var head = s.split(/[''']/)[0].trim();
    var parts = head.replace(/-/g, " ").split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var w = parts[i].replace(/[^a-zA-Z]/g, "");
      if (w.length < 2) continue;
      var low = w.toLowerCase();
      if (TTS_TITLE_SKIP[low]) continue;
      return w;
    }
    return "";
  }

  /** First plausible name: **story title** (e.g. “Freya’s moon”), else book title field, else hero name. */
  function firstNameForReadAloud() {
    var t;
    if (typeof story !== "undefined" && story && story.title) {
      t = firstTokenFromTitleish(story.title);
      if (t) return t;
    }
    if (bookTitleInput && bookTitleInput.value.trim()) {
      t = firstTokenFromTitleish(bookTitleInput.value);
      if (t) return t;
    }
    if (nameInput && nameInput.value.trim()) {
      return firstTokenFromTitleish(nameInput.value);
    }
    return "";
  }

  /**
   * `ballad` for boy-leaning names, `sage` for girl- or unisex-leaning (see name lists).
   * Manual `STORYBOOK_TTS_VOICE` wins. Unknown names omit voice (server default).
   */
  function inferStorybookTtsVoiceId() {
    var manual =
      typeof STORYBOOK_TTS_VOICE === "string" ? STORYBOOK_TTS_VOICE.trim().toLowerCase() : "";
    if (manual) return manual;
    var nm = firstNameForReadAloud();
    if (!nm) return "";
    var k = nm.toLowerCase().replace(/[^a-z]/g, "");
    if (!k) return "";
    if (TTS_GIRL_NAMES[k]) return "sage";
    if (TTS_BOY_NAMES[k]) return "ballad";
    if (TTS_UNISEX_NAMES[k]) return "sage";
    return "";
  }

  /** GET clever-service MP3: `?ttsText=` and optional `&ttsVoice=` (manual or inferred). */
  function cleverServiceTtsUrl(plainText) {
    var base = functionUrl();
    if (!base || plainText == null || plainText === "") return "";
    var q = "?ttsText=" + encodeURIComponent(String(plainText));
    var v = inferStorybookTtsVoiceId();
    if (v) {
      q += "&ttsVoice=" + encodeURIComponent(v);
    }
    return base + q;
  }

  function anonKey() {
    var c =
      typeof window.SCORE_CONFIG !== "undefined"
        ? window.SCORE_CONFIG
        : typeof window.SCORE_SYNC !== "undefined"
          ? window.SCORE_SYNC
          : null;
    return c && c.supabaseAnonKey ? String(c.supabaseAnonKey) : "";
  }

  function getSelectedFamilyPeople() {
    return [];
  }

  function buildBookColorUI() {
    if (!bookColorsQuick || !bookColorsGrid) return;
    var quickN = 4;
    bookColorsQuick.textContent = "";
    bookColorsGrid.textContent = "";
    BOOK_COLOR_OPTIONS.slice(0, quickN).forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-chip";
      b.textContent = item.label;
      b.setAttribute("role", "radio");
      b.setAttribute("data-book-color", item.id);
      b.setAttribute("aria-label", item.label);
      bookColorsQuick.appendChild(b);
    });
    BOOK_COLOR_OPTIONS.slice(quickN).forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-color-swatch";
      b.setAttribute("role", "radio");
      b.setAttribute("data-book-color", item.id);
      b.setAttribute("aria-label", item.label);
      var dot = document.createElement("span");
      dot.className = "sb-color-swatch__dot";
      if (item.swatch) dot.style.background = item.swatch;
      else dot.classList.add("sb-color-swatch__dot--auto");
      b.appendChild(dot);
      var lab = document.createElement("span");
      lab.className = "sb-color-swatch__label";
      lab.textContent = item.label;
      b.appendChild(lab);
      bookColorsGrid.appendChild(b);
    });
    refreshBookColorChips();
  }

  function refreshBookColorChips() {
    if (!bookColorsWrap) return;
    Array.prototype.forEach.call(
      bookColorsWrap.querySelectorAll("[data-book-color]"),
      function (btn) {
        var v = btn.getAttribute("data-book-color");
        if (v === null) v = "";
        var on = v === selectedBookCoverColor;
        btn.classList.toggle("is-selected", on);
        btn.setAttribute("aria-checked", on ? "true" : "false");
      }
    );
  }

  function wireBookColorChips() {
    if (!bookColorsWrap) return;
    bookColorsWrap.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest("[data-book-color]");
      if (!btn || !bookColorsWrap.contains(btn)) return;
      var raw = btn.getAttribute("data-book-color");
      selectedBookCoverColor = raw === null || raw === "" ? "" : raw;
      refreshBookColorChips();
    });
    if (bookColorToggle && bookColorsExtra) {
      bookColorToggle.addEventListener("click", function () {
        var show = bookColorsExtra.hidden;
        bookColorsExtra.hidden = !show;
        bookColorToggle.setAttribute("aria-expanded", show ? "true" : "false");
      });
    }
    refreshBookColorChips();
  }

  /** Must match clever-service `normalizeWizardKey` for character/place IDs. */
  function normalizeWizardPresetKey(id) {
    return String(id || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  /** Must match clever-service `STORYBOOK_CUSTOM_CHOICE_MAX`. */
  var STORYBOOK_CUSTOM_CHOICE_MAX = 200;

  function trimCustomWizardText(el) {
    if (!el) return "";
    return String(el.value || "")
      .trim()
      .slice(0, STORYBOOK_CUSTOM_CHOICE_MAX);
  }

  function syncBuddyCustomPanel() {
    if (!buddyCustomWrap) return;
    var show = selectedChar === "custom_buddy";
    buddyCustomWrap.hidden = !show;
    buddyCustomWrap.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function syncPlaceCustomPanel() {
    if (!placeCustomWrap) return;
    var show = selectedPlace === "custom_place";
    placeCustomWrap.hidden = !show;
    placeCustomWrap.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function refreshCharacterChips() {
    if (!charRow) return;
    Array.prototype.forEach.call(charRow.querySelectorAll(".sb-chip"), function (el, i) {
      var on = CHARACTERS[i].id === selectedChar;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function refreshPlaceChips() {
    if (!placeRow) return;
    Array.prototype.forEach.call(placeRow.querySelectorAll(".sb-chip"), function (el, i) {
      var on = PLACES[i].id === selectedPlace;
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function buildChipRows() {
    if (charRow) {
      charRow.textContent = "";
      CHARACTERS.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sb-chip sb-chip--with-icon";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-label", item.label);
        var ic = document.createElement("span");
        ic.className = "sb-chip__ic";
        ic.setAttribute("aria-hidden", "true");
        ic.textContent = item.icon || "";
        var lbl = document.createElement("span");
        lbl.className = "sb-chip__lbl";
        lbl.textContent = item.label;
        b.appendChild(ic);
        b.appendChild(lbl);
        b.addEventListener("click", function () {
          selectedChar = item.id;
          refreshCharacterChips();
          syncBuddyCustomPanel();
          setError("");
        });
        charRow.appendChild(b);
      });
      refreshCharacterChips();
      syncBuddyCustomPanel();
    }
    if (placeRow) {
      placeRow.textContent = "";
      PLACES.forEach(function (item) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "sb-chip sb-chip--with-icon";
        b.setAttribute("role", "radio");
        b.setAttribute("aria-label", item.label);
        var ic = document.createElement("span");
        ic.className = "sb-chip__ic";
        ic.setAttribute("aria-hidden", "true");
        ic.textContent = item.icon || "";
        var lbl = document.createElement("span");
        lbl.className = "sb-chip__lbl";
        lbl.textContent = item.label;
        b.appendChild(ic);
        b.appendChild(lbl);
        b.addEventListener("click", function () {
          selectedPlace = item.id;
          refreshPlaceChips();
          syncPlaceCustomPanel();
          setError("");
        });
        placeRow.appendChild(b);
      });
      refreshPlaceChips();
      syncPlaceCustomPanel();
    }
    buildBookColorUI();
    wireBookColorChips();
  }

  function renderProgress() {
    if (!progressEl) return;
    progressEl.textContent = "";
    for (var i = 0; i < 4; i++) {
      var cell = document.createElement("span");
      cell.className = "sb-progress-step";
      if (i < journeyStep) cell.classList.add("is-done");
      if (i === journeyStep) cell.classList.add("is-current");
      var d = document.createElement("span");
      d.className = "sb-dot";
      cell.appendChild(d);
      var pl = document.createElement("span");
      pl.className = "sb-progress-step__label";
      pl.textContent = STEP_PROGRESS_LABELS[i] || "";
      cell.appendChild(pl);
      progressEl.appendChild(cell);
    }
  }

  function wirePlotStarters() {
    var wrap = document.getElementById("sbPlotStarters");
    if (!wrap || !plotInput) return;
    wrap.textContent = "";
    PLOT_STARTERS.forEach(function (line) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sb-plot-starter";
      b.textContent = line;
      b.setAttribute("aria-label", "Use idea: " + line);
      b.addEventListener("click", function () {
        var cur = String(plotInput.value || "").trim();
        if (!cur) {
          plotInput.value = line.slice(0, PLOT_INPUT_MAX);
        } else {
          plotInput.value = (cur + " " + line)
            .trim()
            .slice(0, PLOT_INPUT_MAX);
        }
        try {
          plotInput.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (eIn) {}
      });
      wrap.appendChild(b);
    });
  }

  function resetPictureQualityToStandard() {
    var std = document.querySelector(
      'input[name="sbPictureQuality"][value="standard"]'
    );
    var hi = document.querySelector('input[name="sbPictureQuality"][value="high"]');
    if (std) std.checked = true;
    if (hi) hi.checked = false;
  }

  function goToStep(n) {
    if (n !== journeyStep) {
      stopSpeech();
      stopStepGuideAudio();
    }
    journeyStep = Math.max(0, Math.min(3, n));
    if (stepKicker) stepKicker.textContent = "Step " + (journeyStep + 1) + " of 4";
    if (stepHeading) stepHeading.textContent = STEP_HEADINGS[journeyStep] || "";
    renderProgress();
    var panelEls = document.querySelectorAll("#sbModal .sb-panel");
    Array.prototype.forEach.call(panelEls, function (p) {
      var idx = parseInt(p.getAttribute("data-panel") || "0", 10);
      var on = idx === journeyStep;
      p.hidden = !on;
      p.classList.toggle("is-active", on);
    });
    if (journeyStep === 1 && nameInput) {
      window.requestAnimationFrame(function () {
        nameInput.focus();
      });
    }
    if (journeyStep === 2) {
      syncBuddyCustomPanel();
    }
    if (journeyStep === 3) {
      syncPlaceCustomPanel();
      if (plotInput) {
        window.requestAnimationFrame(function () {
          plotInput.focus();
        });
      }
    }
  }

  function openJourney() {
    stopStepGuideAudio();
    var m = modal || document.getElementById("sbModal");
    if (m) {
      m.classList.remove("is-hidden");
      m.removeAttribute("hidden");
      m.hidden = false;
      m.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("sb-modal-open");
    setError("");
    if (bookColorsExtra) bookColorsExtra.hidden = true;
    if (bookColorToggle) bookColorToggle.setAttribute("aria-expanded", "false");
    goToStep(0);
    resetPictureQualityToStandard();
    syncBookSpreadLayoutRadios();
    syncIllustrationStyleRadios();
    syncStoryTextModeRadios();
    syncStoryLengthRadios();
    if (stepHeading) {
      try {
        stepHeading.focus();
      } catch (e1) {}
    }
  }

  function closeJourney() {
    stopSpeech();
    abortHeroPhotoNamePrompt();
    stopStepGuideAudio();
    var m = modal || document.getElementById("sbModal");
    if (m) {
      m.classList.add("is-hidden");
      m.hidden = true;
      m.setAttribute("hidden", "");
      m.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("sb-modal-open");
  }

  /** Close the build-your-book journey and return focus to the landing CTA. */
  function dismissJourneyToLanding() {
    closeJourney();
    if (btnStart && typeof btnStart.focus === "function") {
      try {
        btnStart.focus();
      } catch (_eJourneyFocus) {}
    }
  }

  function setBookActionsOpen(open) {
    if (!book) return;
    book.classList.toggle("sb-book--actions-open", !!open);
    if (actionsFab) {
      actionsFab.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  function setReaderImmersiveFromLayout() {
    if (!book) return;
    var on =
      !book.classList.contains("is-hidden") && immersiveReaderMq.matches;
    if (on) {
      book.classList.add("sb-book--immersive");
      document.body.classList.add("sb-reader-immersive");
    } else {
      book.classList.remove("sb-book--immersive");
      document.body.classList.remove("sb-reader-immersive");
      book.classList.remove("sb-book--actions-open");
      if (actionsFab) actionsFab.setAttribute("aria-expanded", "false");
    }
  }

  /** Leave the reader and show the story hub (landing + shelf). Does not reset the journey form. */
  function returnToStoryLanding() {
    stopReading();
    story = null;
    spreadIndex = 0;
    spreadAnimLock = false;
    if (spreadArtCover) {
      spreadArtCover.removeAttribute("src");
      spreadArtCover.alt = "";
    }
    clearArtFlyleaf();
    if (spreadArtBg) {
      spreadArtBg.style.backgroundImage = "";
    }
    clearSpreadPeelTurnClasses();
    if (spreadArtPeelImg) {
      spreadArtPeelImg.removeAttribute("src");
    }
    if (spreadArtPeelShell) {
      spreadArtPeelShell.hidden = true;
    }
    if (spreadInnerEl) {
      spreadInnerEl.classList.remove(
        "sb-flip-spread__inner--has-art",
        "sb-flip-spread__inner--flyleaf-pane"
      );
      if (spreadInnerEl.dataset && spreadInnerEl.dataset.sbArtUrl) {
        delete spreadInnerEl.dataset.sbArtUrl;
      }
    }
    clearSpreadTurnClasses();
    resetBookCoverForWizard();
    closeJourney();
    document.body.classList.remove("sb-reader-immersive");
    if (book) {
      book.classList.remove("sb-book--immersive");
      book.classList.remove("sb-book--actions-open");
    }
    if (actionsFab) {
      actionsFab.setAttribute("aria-expanded", "false");
    }
    if (landing) {
      landing.classList.remove("is-hidden");
      landing.hidden = false;
    }
    if (book) {
      book.classList.remove("sb-reader--sample");
      book.classList.add("is-hidden");
      book.hidden = true;
    }
    clearBookTheming();
    setError("");
    renderShelf();
  }

  function showWizard() {
    returnToStoryLanding();
    if (nameInput) nameInput.value = "";
    if (bookTitleInput) bookTitleInput.value = "";
    if (plotInput) plotInput.value = "";
    clearHeroPhoto();
    goToStep(0);
    syncBookSpreadLayoutRadios();
    syncIllustrationStyleRadios();
    syncStoryTextModeRadios();
    syncStoryLengthRadios();
  }

  function showBook() {
    if (!story || !story.pages.length) return;
    spreadIndex = 0;
    coverOpenGeneration += 1;
    closeJourney();
    if (landing) {
      landing.classList.add("is-hidden");
      landing.hidden = true;
    }
    if (book) {
      book.classList.remove("is-hidden");
      book.hidden = false;
      if (story && story.isSample) {
        book.classList.add("sb-reader--sample");
      } else {
        book.classList.remove("sb-reader--sample");
      }
    }
    if (readerHeading) readerHeading.textContent = story.title;
    if (coverTitle && story) coverTitle.textContent = story.title;
    if (btnOpenCover && story) {
      btnOpenCover.setAttribute(
        "aria-label",
        "Open the book: " + String(story.title || "your story")
      );
    }
    if (readerStack) {
      readerStack.classList.remove("sb-reader-stack--open");
    }
    if (readerPages) readerPages.setAttribute("aria-hidden", "true");
    if (btnOpenCover) {
      btnOpenCover.removeAttribute("aria-hidden");
      btnOpenCover.removeAttribute("tabindex");
    }
    if (book) book.classList.add("sb-book--cover-visible");
    if (book) {
      var inArt = firstSpreadArtUrlForCover();
      if (inArt) {
        var esc = String(inArt).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        book.style.setProperty("--sb-cover-inside-art", 'url("' + esc + '")');
      } else {
        book.style.removeProperty("--sb-cover-inside-art");
      }
    }
    applyBookThemingFromStory();
    renderSpread();
    syncCloseBookButton();
    setBookActionsOpen(false);
    setReaderImmersiveFromLayout();
  }

  function selectedPictureBookQuality() {
    var el = document.querySelector('input[name="sbPictureQuality"]:checked');
    if (el && String(el.value).toLowerCase() === "high") return "high";
    return "standard";
  }

  function setBusy(on) {
    if (!busy) return;
    if (on) {
      busy.classList.remove("is-hidden");
      busy.hidden = false;
    } else {
      busy.classList.add("is-hidden");
      busy.hidden = true;
    }
  }

  function initPortalWelcome() {
    var el = document.getElementById("sbPortalWelcome");
    if (!el) return;
    var params;
    try {
      params = new URLSearchParams(window.location.search || "");
    } catch (e) {
      return;
    }
    if (String(params.get("from") || "") !== "portal") return;

    var dismissBtn = document.getElementById("sbPortalWelcomeDismiss");
    var titleEl = document.getElementById("sbPortalWelcomeTitle");
    var leadEl = document.getElementById("sbPortalWelcomeLead");
    var prof =
      typeof KidsCore !== "undefined" && typeof KidsCore.getProfile === "function"
        ? KidsCore.getProfile()
        : {};
    var rawName = prof && prof.name ? String(prof.name).trim() : "";
    var displayName = rawName || "Sofia";
    if (titleEl) {
      titleEl.textContent = "Welcome back, " + displayName + "!";
    }
    if (leadEl) {
      leadEl.textContent =
        "Let’s get creative — start a new book or open one you’ve put on your shelf.";
    }
    var reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function cleanUrl() {
      try {
        var u = new URL(window.location.href);
        if (!u.searchParams.has("from")) return;
        u.searchParams.delete("from");
        var next = u.pathname + (u.search || "") + (u.hash || "");
        window.history.replaceState({}, "", next);
      } catch (e2) {}
    }

    function dismiss() {
      if (!el || el.hidden) return;
      el.classList.add("is-leaving");
      document.body.classList.remove("sb-portal-welcome-open");
      window.setTimeout(function () {
        el.hidden = true;
        el.classList.remove("is-active", "is-leaving");
        el.setAttribute("aria-hidden", "true");
        document.removeEventListener("keydown", onKey);
        var startBtn = document.getElementById("sbStartJourney");
        if (startBtn && typeof startBtn.focus === "function") {
          startBtn.focus();
        }
      }, reduced ? 120 : 340);
    }

    function onKey(ev) {
      if (ev.key === "Escape") {
        ev.preventDefault();
        dismiss();
      }
    }

    cleanUrl();
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("sb-portal-welcome-open");
    document.addEventListener("keydown", onKey);

    if (dismissBtn) {
      dismissBtn.addEventListener("click", function (e) {
        e.preventDefault();
        dismiss();
      });
    }

    el.addEventListener("click", function (e) {
      if (
        e.target &&
        e.target.classList &&
        e.target.classList.contains("sb-portal-welcome__veil")
      ) {
        dismiss();
      }
    });

    if (reduced) {
      el.classList.add("is-active");
      if (dismissBtn) dismissBtn.focus();
    } else {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          el.classList.add("is-active");
          if (dismissBtn) dismissBtn.focus();
        });
      });
    }
  }

  function startStorybookApp() {
  buildChipRows();
  wirePlotStarters();
  if (readStepBtn) {
    readStepBtn.addEventListener("click", toggleStepGuide);
    refreshReadStepBtn();
  }
  initVoiceUi();

    function runAfterShelfHydrate() {
  renderShelf();
      setupShelfCloudSync();
    }

    if (window.StorybookShelfStore && typeof window.StorybookShelfStore.ready === "function") {
      window.StorybookShelfStore.ready()
        .then(function () {
          return window.StorybookShelfStore.getJson();
        })
        .then(function (list) {
          shelfCache = Array.isArray(list) ? list : [];
        })
        .catch(recoverShelfAfterStoreFailure)
        .then(runAfterShelfHydrate);
    } else {
      shelfCache = loadShelfSyncFromLocalStorage();
      runAfterShelfHydrate();
    }
  }

  function mergeFailedMessage(raw) {
    var s = String(raw || "");
    if (
      s === "localStorage_quota" ||
      s === "storage_quota" ||
      /quota|QuotaExceeded/i.test(s)
    ) {
      return (
        "Could not save your library — this phone or tablet ran out of browser storage for this site.\n\n" +
        "None of your stories were removed automatically. The new save did not replace anything.\n\n" +
        "Remove books yourself (tap × on a shelf cover), or clear site data for this website in Safari/Chrome settings to free space — then try again. Use ⚙️ Sync & ☁️ when you can so backups can upload."
      );
    }
    return s;
  }

  function setupShelfCloudSync() {
    if (!window.KidsScoreCloud || !window.KidsScoreCloud.mergeStorybookShelfFromCloud) {
      return;
    }
    var shelfPullTimer = null;
    function pullShelfFromCloudNow() {
      window.KidsScoreCloud.mergeStorybookShelfFromCloud(function (err) {
        if (err) {
          var msg = err && err.message ? err.message : String(err);
          window.alert(
            "Could not load your library from the cloud.\n\n" +
              mergeFailedMessage(msg) +
              "\n\nAlso check you are signed in under ⚙️ on this device.",
          );
        }
        reloadShelfCacheFromStore(function () {
          renderShelf();
        });
      });
    }
    function pullShelfFromCloud() {
      if (shelfPullTimer) {
        clearTimeout(shelfPullTimer);
      }
      shelfPullTimer = setTimeout(function () {
        shelfPullTimer = null;
        pullShelfFromCloudNow();
      }, 200);
    }

    window.addEventListener("kids-storybook-merge-failed", function (e) {
      var raw = (e.detail && e.detail.message) || "Unknown error";
      window.alert("Could not update your story library on this device.\n\n" + mergeFailedMessage(raw));
      reloadShelfCacheFromStore(function () {
        renderShelf();
      });
    });

    pullShelfFromCloudNow();
    window.addEventListener("kids-scorecard-refresh", function () {
      reloadShelfCacheFromStore(function () {
          renderShelf();
      });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") {
        pullShelfFromCloud();
      }
    });
    window.addEventListener("pageshow", function () {
      pullShelfFromCloud();
    });

    var btnPullLibrary = document.getElementById("sbPullLibrary");
    if (btnPullLibrary) {
      function syncPullButtonVisibility() {
        var on =
          window.KidsScoreCloud &&
          window.KidsScoreCloud.isConfigured &&
          window.KidsScoreCloud.isConfigured();
        btnPullLibrary.hidden = !on;
      }
      syncPullButtonVisibility();
      window.addEventListener("kids-scorecard-refresh", syncPullButtonVisibility);
      btnPullLibrary.addEventListener("click", function () {
        if (!window.KidsScoreCloud.isConfigured || !window.KidsScoreCloud.isConfigured()) {
          window.alert(
            "Turn on Sync on the main menu (gear) and sign in — then you can pull books from the cloud.",
          );
          return;
        }
        pullShelfFromCloudNow();
      });
    }
  }

  initPortalWelcome();
  startStorybookApp();

  if (immersiveReaderMq.addEventListener) {
    immersiveReaderMq.addEventListener("change", setReaderImmersiveFromLayout);
  } else if (immersiveReaderMq.addListener) {
    immersiveReaderMq.addListener(setReaderImmersiveFromLayout);
  }

  if (actionsFab) {
    actionsFab.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (!book || !book.classList.contains("sb-book--immersive")) return;
      var open = !book.classList.contains("sb-book--actions-open");
      setBookActionsOpen(open);
    });
  }
  document.addEventListener(
    "click",
    function (e) {
      if (!book || !book.classList.contains("sb-book--immersive")) return;
      if (!book.classList.contains("sb-book--actions-open")) return;
      if (!actionsDock || !e.target || !e.target.closest) return;
      if (e.target.closest("#sbBookActionsDock")) return;
      setBookActionsOpen(false);
    },
    true
  );
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!book || !book.classList.contains("sb-book--immersive")) return;
    if (!book.classList.contains("sb-book--actions-open")) return;
    setBookActionsOpen(false);
  });

  var btnPreviewSample = document.getElementById("sbPreviewSample");

  if (appEl) {
    appEl.addEventListener(
      "click",
      function (e) {
        if (!e.target || !e.target.closest) return;
        if (e.target.closest("#sbJourneyClose")) {
          e.preventDefault();
          dismissJourneyToLanding();
          return;
        }
        if (e.target.closest("#sbStartJourney")) {
          e.preventDefault();
          openJourney();
        }
        if (e.target.closest("#sbPreviewSample")) {
          e.preventDefault();
          openSampleBook();
        }
        if (e.target.closest("#sbOpenCover")) {
          e.preventDefault();
          openBookCover();
        }
        if (e.target.closest("#sbCloseBook")) {
          e.preventDefault();
          closeBookCover();
        }
        if (e.target.closest("a.sb-back.back-btn")) {
          if (
            book &&
            !book.classList.contains("is-hidden") &&
            !book.hidden
          ) {
            e.preventDefault();
            returnToStoryLanding();
          }
        }
      },
      false
    );
  } else if (btnStart) {
    btnStart.addEventListener("click", function (e) {
      e.preventDefault();
      openJourney();
    });
  }

  var btnJourneyClose = document.getElementById("sbJourneyClose");
  var modalBackdropEl = document.querySelector("#sbModal .sb-modal__backdrop");
  if (btnJourneyClose && !appEl) {
    btnJourneyClose.addEventListener("click", function (e) {
      e.preventDefault();
      dismissJourneyToLanding();
    });
  }
  if (modalBackdropEl) {
    modalBackdropEl.addEventListener("click", function () {
      var m = modal || document.getElementById("sbModal");
      if (!m || m.hidden || m.classList.contains("is-hidden")) return;
      dismissJourneyToLanding();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var m = modal || document.getElementById("sbModal");
    if (!m || m.hidden || m.classList.contains("is-hidden")) return;
    if (
      heroPhotoNameOverlay &&
      !heroPhotoNameOverlay.classList.contains("is-hidden")
    ) {
      e.preventDefault();
      abortHeroPhotoNamePrompt();
      return;
    }
    e.preventDefault();
    dismissJourneyToLanding();
  });

  if (btnPreviewSample && !appEl) {
    btnPreviewSample.addEventListener("click", function (e) {
      e.preventDefault();
      openSampleBook();
    });
  }

  if (btnOpenCover && !appEl) {
    btnOpenCover.addEventListener("click", function (e) {
      e.preventDefault();
      openBookCover();
    });
  }

  if (btnCloseBook && !appEl) {
    btnCloseBook.addEventListener("click", function (e) {
      e.preventDefault();
      closeBookCover();
    });
  }

  if (heroPhotoInput) {
    heroPhotoInput.addEventListener("change", function () {
      setHeroPhotoError("");
      var files = Array.prototype.slice.call(heroPhotoInput.files || []);
      heroPhotoInput.value = "";
      if (!files.length) return;
      var slotsLeft = HERO_PHOTO_MAX_COUNT - heroPhotoItems.length;
      if (slotsLeft <= 0) {
        setHeroPhotoError("You already have 3 photos — remove one to add another.");
        return;
      }
      if (files.length > slotsLeft) {
        setHeroPhotoError("Only room for " + slotsLeft + " more — pick fewer photos.");
        files = files.slice(0, slotsLeft);
      }
      for (var i = 0; i < files.length; i++) {
        if (!/^image\/(jpeg|png|webp)$/i.test(files[i].type)) {
          setHeroPhotoError("Use JPG, PNG, or WebP photos only.");
          return;
        }
        if (files[i].size > HERO_PHOTO_MAX_FILE_BYTES) {
          setHeroPhotoError("Each photo must be under about 1 MB.");
          return;
        }
      }
      var reads = files.map(function (f) {
        return new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onload = function () {
            resolve(typeof r.result === "string" ? r.result : "");
          };
          r.onerror = function () {
            reject(new Error("read"));
          };
          r.readAsDataURL(f);
        });
      });
      Promise.all(reads)
        .then(function (urls) {
          var prevLenAdd = heroPhotoItems.length;
          urls.forEach(function (url) {
            if (
              url &&
              /^data:image\//i.test(url) &&
              heroPhotoItems.length < HERO_PHOTO_MAX_COUNT
            ) {
              heroPhotoItems.push({ dataUrl: url, who: "hero" });
            }
          });
          var freshIdxs = [];
          var ai;
          for (ai = prevLenAdd; ai < heroPhotoItems.length; ai++) {
            freshIdxs.push(ai);
          }
          beginHeroPhotoNamePromptForNewIndices(freshIdxs);
        })
        .catch(function () {
          setHeroPhotoError("Could not read that photo.");
        });
    });
  }
  if (heroPhotoThumbsList) {
    heroPhotoThumbsList.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var rm = t.closest(".sb-hero-ref__thumb-remove");
      if (!rm) return;
      var idx = parseInt(rm.getAttribute("data-idx") || "-1", 10);
      if (idx >= 0 && idx < heroPhotoItems.length) {
        heroPhotoItems.splice(idx, 1);
        abortHeroPhotoNamePrompt();
        renderHeroPhotoThumbs();
        setHeroPhotoError("");
      }
    });
  }
  if (heroPhotoRemove) {
    heroPhotoRemove.addEventListener("click", function () {
      clearHeroPhoto();
    });
  }
  if (btnHeroPhotoNameOk) {
    btnHeroPhotoNameOk.addEventListener("click", function () {
      onHeroPhotoNameDoneClick();
    });
  }
  if (btnHeroPhotoNameMe) {
    btnHeroPhotoNameMe.addEventListener("click", function () {
      onHeroPhotoNameMeClick();
    });
  }
  if (btnHeroPhotoNameVoice) {
    btnHeroPhotoNameVoice.addEventListener("click", function () {
      startHeroPhotoNameSpeech();
    });
  }
  if (heroPhotoNameInput) {
    heroPhotoNameInput.addEventListener("keydown", function (evIn) {
      if (evIn.key !== "Enter") return;
      evIn.preventDefault();
      onHeroPhotoNameDoneClick();
    });
  }
  if (nameInput) {
    nameInput.addEventListener("input", function () {
      renderHeroPhotoThumbs();
    });
  }
  if (heroPhotoPickBtn && heroPhotoInput) {
    heroPhotoPickBtn.addEventListener("click", function () {
      heroPhotoInput.click();
    });
  }

  var btnNext0 = document.getElementById("sbNext0");
  var btnBack1 = document.getElementById("sbBack1");
  var btnNext1 = document.getElementById("sbNext1");
  var btnSkipToPlot = document.getElementById("sbSkipToPlot");
  var btnBack2 = document.getElementById("sbBack2");
  var btnNext2 = document.getElementById("sbNext2");
  var btnBack4 = document.getElementById("sbBack4");

  if (btnNext0) btnNext0.addEventListener("click", function () { goToStep(1); });
  if (btnBack1) btnBack1.addEventListener("click", function () { goToStep(0); });
  if (btnNext1) {
    btnNext1.addEventListener("click", function () {
      skippedBuddyAndPlace = false;
      goToStep(2);
    });
  }
  if (btnSkipToPlot) {
    btnSkipToPlot.addEventListener("click", function () {
      skippedBuddyAndPlace = true;
      selectedChar = "unicorn";
      selectedPlace = "beach";
      refreshCharacterChips();
      refreshPlaceChips();
      goToStep(3);
    });
  }
  if (btnBack2) btnBack2.addEventListener("click", function () { goToStep(1); });
  if (btnNext2) btnNext2.addEventListener("click", function () {
    if (selectedChar === "custom_buddy") {
      var t = trimCustomWizardText(buddyCustomInput);
      if (t.length < 4) {
        setError("Please describe your buddy in a few words (at least 4 letters).");
        return;
      }
    }
    setError("");
    goToStep(3);
  });
  if (btnBack4) {
    btnBack4.addEventListener("click", function () {
      goToStep(skippedBuddyAndPlace ? 1 : 2);
    });
  }

  if (btnGen) {
    btnGen.addEventListener("click", function () {
      setError("");
      setReaderArtLayout(readBookSpreadLayoutFromWizard());
      setIllustrationStyle(readIllustrationStyleFromWizard());
      setStoryTextMode(readStoryTextModeFromWizard());
      setStoryLength(readStoryLengthFromWizard());
      var url = functionUrl();
      var key = anonKey();
      if (!url || !key) {
        setError("Story magic isn’t set up here yet. Ask a grown-up to open ⚙️ and check sign-in / settings.");
        return;
      }
      var childName = nameInput ? nameInput.value.trim() : "";
      var plotHint = plotInput ? plotInput.value.trim() : "";
      var customAuthor = authorInput ? authorInput.value.trim() : "";
      if (selectedPlace === "custom_place") {
        var placeText = trimCustomWizardText(placeCustomInput);
        if (placeText.length < 4) {
          setError(
            "Please describe where the story happens (at least 4 letters), or pick a scene above."
          );
          return;
        }
      }
      setBusy(true);
      var familyPeople = getSelectedFamilyPeople();
      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + key,
          apikey: key,
        },
        body: JSON.stringify({
          childName: childName || "Friend",
          character: normalizeWizardPresetKey(selectedChar),
          place: normalizeWizardPresetKey(selectedPlace),
          plotHint: plotHint,
          buddyCustom:
            selectedChar === "custom_buddy"
              ? trimCustomWizardText(buddyCustomInput) || undefined
              : undefined,
          placeCustom:
            selectedPlace === "custom_place"
              ? trimCustomWizardText(placeCustomInput) || undefined
              : undefined,
          pictureBookQuality: selectedPictureBookQuality(),
          illustrationStyle: readIllustrationStyleFromWizard(),
          readerArtLayout: readBookSpreadLayoutFromWizard(),
          storyTextMode: readStoryTextModeFromWizard(),
          storyLength: readStoryLengthFromWizard(),
          author: customAuthor || undefined,
          familyNames: familyPeople.map(function (p) {
            return p.label;
          }),
          familyPeople: familyPeople,
          bookCoverColor: selectedBookCoverColor || undefined,
          characterReferencePhotos: heroPhotoItems.length
            ? heroPhotoItems.map(function (x) {
                return { who: x.who, image: x.dataUrl };
              })
            : undefined,
        }),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            return { ok: r.ok, status: r.status, body: j };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            var b =
              out.body && typeof out.body === "object" ? out.body : {};
            /** Supabase WORKER_LIMIT or Gateway Timeout — story + six images often exceeds Edge budget */
            var isTimeout =
              out.status === 546 ||
              out.status === 504 ||
              Number(b.code) === 546 ||
              Number(b.code) === 504;
            var msg;
            if (isTimeout) {
              msg =
                "The story maker ran out of time — it was still drawing lots of pictures. Wait a moment and try again, or ask a grown-up for help.";
            } else if (b.error === "server_missing_openai") {
              msg =
                "Story drawing isn’t turned on for this game yet. A grown-up needs to finish setup on the server.";
            } else if (b.error === "fal_failed" && b.detail) {
              msg =
                "We couldn’t finish all the pictures — you weren’t given a mismatched book. Wait a moment and try again, or ask a grown-up to check billing and setup. " +
                String(b.detail).slice(0, 400);
            } else if (b.error === "gpt_image_failed" && b.detail) {
              msg =
                "Couldn’t make the book (pictures). " + String(b.detail).slice(0, 500);
            } else if (b.error === "images_failed" && b.detail) {
              msg =
                "Couldn’t make the book (pictures). " + String(b.detail);
            } else if (b.error === "invalid_choices") {
              var detail = String(b.detail || "").trim();
              if (detail.indexOf("unknown_place:") === 0) {
                msg =
                  "That scene name didn’t reach the Storybook maker yet — ask a grown-up to redeploy the latest clever-service update, or try another scene for now.";
              } else if (detail.indexOf("unknown_character:") === 0) {
                msg =
                  "That buddy name didn’t reach the Storybook maker yet — ask a grown-up to redeploy the latest clever-service update, or try another buddy for now.";
              } else if (detail === "custom_place_too_short") {
                msg =
                  "Please describe where the story happens — at least 4 letters — or tap a scene above instead of \"Add your own scene\".";
              } else if (detail === "custom_buddy_too_short") {
                msg =
                  "Please describe your buddy in a few more words — at least 4 letters.";
              } else if (detail) {
                msg =
                  "We couldn’t use one of those story choices (" + detail.slice(0, 160) + "). Try another tap or refresh the page.";
              } else {
                msg =
                  "We couldn’t use one of those story choices. Refresh the page, or pick a different buddy or scene.";
              }
            } else if (b.error === "story_failed") {
              msg =
                "Couldn’t finish the story text. Try again — if it keeps happening, ask a grown-up to check the setup.";
              if (b.detail) {
                msg += " " + String(b.detail).slice(0, 320);
              }
            } else if (b.error && typeof b.error === "string") {
              msg = "Couldn’t make the book (" + b.error + ").";
            } else {
              msg =
                "Couldn’t make the book (HTTP " +
                out.status +
                (b.msg ? ": " + String(b.msg).slice(0, 240) : "") +
                ").";
            }
            setError(msg);
            return;
          }
          var apiTitle =
            out.body && out.body.title ? String(out.body.title).trim() : "";
          var customTitle = bookTitleInput ? bookTitleInput.value.trim() : "";
          var customAuthor = authorInput ? authorInput.value.trim() : "";
          story = {
            title: customTitle || apiTitle || "Your story",
            author: customAuthor,
            bookColor: out.body.bookColor || null,
            readerFont: out.body.readerFont || null,
            readerArtLayout: readBookSpreadLayoutFromWizard(),
            storyTextMode: readStoryTextModeFromWizard(),
            storyLength: readStoryLengthFromWizard(),
            pages: out.body.pages || [],
            sceneImageUrl: out.body.sceneImageUrl || null,
          };
          spreadIndex = 0;
          showBook();
        })
        .catch(function () {
          var u = functionUrl();
          setError(
            u
              ? "Can’t reach the story magic right now. Check your internet, or ask a grown-up to try again in a minute."
              : "Story magic isn’t set up here yet. Ask a grown-up to open ⚙️ and check sign-in / settings."
          );
        })
        .finally(function () {
          setBusy(false);
        });
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener("click", function () {
      goPrevPage();
    });
  }
  if (btnNext) {
    btnNext.addEventListener("click", function () {
      goNextPage();
    });
  }
  if (btnNew) {
    btnNew.addEventListener("click", function () {
      setBookActionsOpen(false);
      showWizard();
    });
  }
  if (btnDownload) {
    btnDownload.addEventListener("click", function () {
      setBookActionsOpen(false);
      downloadStoryBook();
    });
  }
  if (btnShelf) {
    btnShelf.addEventListener("click", function () {
      setBookActionsOpen(false);
      saveBookToShelf();
    });
  }

  var prevCarouselBtn = document.getElementById("sbCarouselPrev");
  if (prevCarouselBtn) {
    prevCarouselBtn.addEventListener("click", function () {
      scrollCarousel(-1);
    });
  }
  
  var nextCarouselBtn = document.getElementById("sbCarouselNext");
  if (nextCarouselBtn) {
    nextCarouselBtn.addEventListener("click", function () {
      scrollCarousel(1);
    });
  }
  
  if (shelfEl) {
    shelfEl.addEventListener("scroll", function () {
      updateCarouselButtons();
    });
  }

  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get("sample") === "1" || params.get("demo") === "1") {
      openSampleBook();
    }
  } catch (err) {}

  if (typeof KidsCore !== "undefined") {
    KidsCore.init();
    KidsCore.bindTapSound(document.getElementById("app"));
  }

  syncBookSpreadLayoutRadios();
  syncIllustrationStyleRadios();
  syncStoryTextModeRadios();
  syncStoryLengthRadios();
})();
