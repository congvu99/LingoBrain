/* Game Pháp Sư Lexoria — DỮ LIỆU THUẦN: 4 vùng đất, 12 quái (5 dáng tham số), 28 đoạn truyện (index = beat).
   Không có hàm ở đây (chỉ literal) — logic tra cứu (theo beat/wins) nằm ở boss-game-story-journal-ui.js.
   '{id}' trong intro/outro = từ tiếng Anh có thật trong words.json (kiểm bằng tests/boss-game-story.test.js);
   đã học → tô màu + bấm nghe (storySegments ở boss-game-progress.js). weak ∈ BOSS_ELEMENTS (boss-progress-sync-merge.js).
   Khắc hệ theo brainstorm: ch.1 sợ 🔥 fire · ch.2 🌿 earth · ch.3 ❄️ ice · ch.4 ⚡ storm (CHỈ áp cho trùm chương;
   quái thường có thể khác hệ để đa dạng — ghi ở từng quái). hpMul: quái thường 1 (≈ BOSS_TUNING.hp.minion), trùm 2 (≈ .boss).
   clockMul: hệ số tốc độ nạp đòn của quái đó (tư liệu cho vòng cân bằng sau — chưa được boss-game-logic.js đọc). */

const BOSS_REGIONS = [
  { id: 'ashford', name: 'Làng Ashford', sky: ['#ffb374', '#7b3fa0', '#241242'], ground: '#241a34', accent: '#ffd76a' },
  { id: 'catacombs', name: 'Hầm mộ', sky: ['#171528', '#0b0a14'], ground: '#26232f', accent: '#8fd7a8' },
  { id: 'cliffs', name: 'Núi đá', sky: ['#8fb6d9', '#c9d8e6', '#eef3f6'], ground: '#4a5361', accent: '#e8f0f6' },
  { id: 'dragonlair', name: 'Hang rồng', sky: ['#210a08', '#3c1208', '#170603'], ground: '#1c100a', accent: '#ff9a3c' }
];

const BOSS_MONSTERS = [
  { id: 'goblin', name: 'Goblin', shape: 'humanoid', region: 'ashford', size: 0.85, weak: 'fire', hpMul: 1, clockMul: 1,
    attackFx: 'slash', features: { horns: true },
    palette: { body: '#4c7a3a', dark: '#2e4d22', accent: '#7ea24f', eye: '#ff5a3c', skin: '#5c8a44' } },
  { id: 'wolf', name: 'Sói Bóng Đêm', shape: 'beast', region: 'ashford', size: 0.9, weak: 'storm', hpMul: 1, clockMul: 1,
    attackFx: 'bite', features: {},
    palette: { body: '#3a3a46', dark: '#201f28', accent: '#6d6d7c', eye: '#ffe066', skin: '#55545f' } },
  { id: 'goblinKing', name: 'Vua Goblin', shape: 'humanoid', region: 'ashford', size: 1.35, weak: 'fire', hpMul: 2, clockMul: 0.85,
    attackFx: 'slam', features: { horns: true, crown: true, cloak: true },
    palette: { body: '#5c8a30', dark: '#33511c', accent: '#8fbf4a', eye: '#ff3b3b', skin: '#6c9a3a' } },
  { id: 'skeleton', name: 'Xương', shape: 'humanoid', region: 'catacombs', size: 0.9, weak: 'earth', hpMul: 1, clockMul: 1,
    attackFx: 'slash', features: { bones: true },
    palette: { body: '#d8d2c0', dark: '#8f8a78', accent: '#c7c0aa', eye: '#7de8ff', skin: '#e6e0cc' } },
  { id: 'ghost', name: 'Ma', shape: 'wraith', region: 'catacombs', size: 1, weak: 'storm', hpMul: 1, clockMul: 1,
    attackFx: 'curse', features: {},
    palette: { body: '#b9d8ff', dark: '#5f7aa8', accent: '#e4f1ff', eye: '#6fffe0', skin: '#cfe6ff' } },
  { id: 'lich', name: 'Lich', shape: 'humanoid', region: 'catacombs', size: 1.3, weak: 'earth', hpMul: 2, clockMul: 0.85,
    attackFx: 'curse', features: { hood: true, cloak: true },
    palette: { body: '#3c2f55', dark: '#241c38', accent: '#8f6fd1', eye: '#7de8ff', skin: '#cfc7e6' } },
  { id: 'troll', name: 'Troll', shape: 'humanoid', region: 'cliffs', size: 1.2, weak: 'ice', hpMul: 1, clockMul: 1.1,
    attackFx: 'slam', features: { club: true },
    palette: { body: '#6a7a4a', dark: '#3e4a2a', accent: '#8f9a5f', eye: '#ffcf5c', skin: '#78885a' } },
  { id: 'harpy', name: 'Harpy', shape: 'flyer', region: 'cliffs', size: 0.95, weak: 'fire', hpMul: 1, clockMul: 0.9,
    attackFx: 'dive', features: { feathered: true, beak: true },
    palette: { body: '#8a5a3a', dark: '#5a3a22', accent: '#d8c090', eye: '#ffe066', skin: '#c9a877' } },
  { id: 'wyvern', name: 'Wyvern', shape: 'flyer', region: 'cliffs', size: 1.4, weak: 'ice', hpMul: 2, clockMul: 0.85,
    attackFx: 'breath', features: { scales: true, tail: true },
    palette: { body: '#4a6a7a', dark: '#2a3e4a', accent: '#8fc4d8', eye: '#ff5a3c', skin: '#5a7d8f' } },
  { id: 'darkKnight', name: 'Hiệp Sĩ Đen', shape: 'humanoid', region: 'dragonlair', size: 1.1, weak: 'ice', hpMul: 1, clockMul: 1,
    attackFx: 'slash', features: { armor: true, cloak: true },
    palette: { body: '#2a2a34', dark: '#141419', accent: '#7a1f2b', eye: '#ff2d2d', skin: '#403f4a' } },
  { id: 'youngDragon', name: 'Rồng Con', shape: 'dragon', region: 'dragonlair', size: 1.15, weak: 'storm', hpMul: 1, clockMul: 0.95,
    attackFx: 'breath', features: { wings: true },
    palette: { body: '#c0432c', dark: '#7a2416', accent: '#ff9a3c', eye: '#ffe066', skin: '#e0663f' } },
  { id: 'oblivion', name: 'Oblivion', shape: 'dragon', region: 'dragonlair', size: 1.8, weak: 'storm', hpMul: 2, clockMul: 0.8,
    attackFx: 'roar', features: { wings: true, crownSpikes: true, runes: true },
    palette: { body: '#1c1024', dark: '#0c0714', accent: '#8f2fd1', eye: '#ff3bd1', skin: '#2a1a38' } }
];

/* 28 đoạn (beat 0..27) — 7 trận/chương (6 quái thường + 1 trùm); monster = id trong BOSS_MONSTERS. */
const BOSS_STORY = [
  // Chương 1 — Làng Ashford
  { monster: 'goblin', intro: 'Từ vực sâu Lexoria, rồng Oblivion vừa {wake}, hơi thở của hắn nuốt lấy từng {word} còn sót lại trong ký ức loài người. Ánh {light} cuối ngày tắt dần trên mái nhà Ashford — một Goblin lẻn vào sân kho, mắt đỏ rực trong bóng tối.', outro: 'Goblin tan thành khói, để lại một rune sáng. Ngôi làng lấy lại chút {hope}.' },
  { monster: 'wolf', intro: 'Tiếng {storm} xa xa hoà cùng tiếng hú của Sói Bóng Đêm. Nó rình rập quanh giếng làng, chờ ai đó mất cảnh giác. Bạn giơ trượng, sẵn sàng cho {battle}.', outro: 'Sói ngã quỵ dưới ánh phép. Dân làng thở phào, {return} về nhà an toàn.' },
  { monster: 'goblin', intro: 'Một bầy Goblin khác kéo tới, đông hơn và {brave} hơn lần trước. Chúng đã đánh hơi được rune vừa hồi sinh.', outro: 'Chiến thắng nhỏ, nhưng mỗi rune giành lại là một {word} cứu được.' },
  { monster: 'wolf', intro: 'Đêm nay {cold} hơn thường lệ — dấu hiệu Oblivion đang lan rộng bóng tối. Một con sói khác gầm gừ giữa {forest} rìa làng.', outro: 'Bạn {win}, và khu rừng như sáng lên đôi chút.' },
  { monster: 'goblin', intro: 'Goblin lần này mang theo {stone} nhọn làm vũ khí, liều lĩnh {attack} bất kỳ ai lại gần kho thóc.', outro: 'Nó bỏ chạy tán loạn — dân Ashford tạm yên {sleep} qua đêm.' },
  { monster: 'wolf', intro: 'Sói đầu đàn xuất hiện, to lớn và {strong} hơn cả, mắt nó không còn tia sáng nào của sự sống.', outro: 'Bạn hạ nó trong tiếng {breath} dồn dập — một trận đánh không dễ dàng.' },
  { monster: 'goblinKing', intro: 'Vua Goblin bước ra từ {tower} đổ nát, đội {gold} vương miện cướp được. Hắn hét lên, thách thức pháp sư trẻ giữ lấy ngôi làng.', outro: 'Vương miện vỡ tan. Ashford được {save} — nhưng Oblivion vẫn còn xa lắm.' },
  // Chương 2 — Hầm mộ
  { monster: 'skeleton', intro: 'Dưới lòng đất, hành lang {ancient} dẫn vào hầm mộ tối tăm. Một bộ Xương trỗi dậy, giáo mác kêu lạch cạch trong bóng {silent}.', outro: 'Xương vỡ vụn thành {dust}. Con đường vào sâu hơn đã mở.' },
  { monster: 'ghost', intro: 'Một bóng Ma lướt qua, thì thầm những {memory} bị lãng quên. Nó muốn kéo bạn vào cõi {loss} cùng nó.', outro: 'Ánh phép xua tan hồn ma. Một tiếng {voice} nhỏ cảm ơn vọng lại rồi biến mất.' },
  { monster: 'skeleton', intro: 'Thêm nhiều bộ Xương canh giữ cánh cửa {stone}, như thể chúng sợ ai đó tìm ra bí mật bên trong.', outro: 'Bạn bước qua xác chúng, tiến gần hơn tới {secret} của hầm mộ.' },
  { monster: 'ghost', intro: 'Tiếng {shout} vọng khắp hành lang — hồn ma giận dữ vì bị quấy rầy giấc {sleep} ngàn năm.', outro: 'Nó tan biến trong ánh sáng, để lại cảm giác {quiet} lạ thường.' },
  { monster: 'skeleton', intro: 'Một bộ Xương {strong} hơn đứng chắn lối, có vẻ từng là hiệp sĩ canh gác nơi này.', outro: 'Nó gục xuống, rune xương vỡ vụn để lại thêm {memory} về trận chiến này.' },
  { monster: 'ghost', intro: 'Bóng ma cuối cùng trông {lonely} đến lạ, như đang chờ ai đó giải thoát nó khỏi hầm mộ.', outro: 'Nó mỉm cười — nếu hồn ma có thể — trước khi tan vào {light}.' },
  { monster: 'lich', intro: 'Lich ngồi trên ngai làm từ {bone}, đôi tay toả ra {power} u ám, đôi mắt xanh biếc xuyên thấu bóng tối.', outro: 'Lich tan vào {dust}. Hầm mộ chìm trong vẻ {silent} ngàn năm.' },
  // Chương 3 — Núi đá
  { monster: 'troll', intro: 'Đường lên Núi đá gập ghềnh, gió {wind} lạnh buốt cắt da. Một tên Troll khổng lồ chặn {road}, gầm lên hung tợn.', outro: 'Troll ngã quỵ, để bạn tiếp tục {journey} lên cao.' },
  { monster: 'harpy', intro: 'Một con Harpy lao xuống từ vách đá, móng vuốt sắc như muốn xé toạc {hope} còn sót lại.', outro: 'Nó bay đi trong hoảng loạn, bỏ lại một chiếc {wing} rơi xuống vực.' },
  { monster: 'troll', intro: 'Troll thứ hai to hơn, mang theo {rock} làm vũ khí, quyết {protect} hang ổ của bầy đàn.', outro: 'Bạn {win} sau một trận giằng co dài.' },
  { monster: 'harpy', intro: 'Bầy Harpy kêu {loud} trên đỉnh núi, báo hiệu có kẻ lạ xâm nhập lãnh thổ của chúng.', outro: 'Tiếng kêu tắt dần, chỉ còn {quiet} bao trùm vách núi.' },
  { monster: 'troll', intro: 'Một Troll {dangerous} hơn hẳn đứng gác cửa hang, cơ bắp cuồn cuộn dưới lớp da xám.', outro: 'Nó gục xuống — bạn tiến thêm một bước gần hơn tới đỉnh {mountain}, nơi Wyvern ngự trị.' },
  { monster: 'harpy', intro: 'Harpy chúa canh giữ tổ đá cao nhất, không để ai {escape} khỏi tầm mắt sắc bén của nó.', outro: 'Bạn hạ nó, giành lại một rune quý giá giữa {mountain}.' },
  { monster: 'wyvern', intro: 'Wyvern xoè cánh giữa những đám mây {cold}, hơi thở của nó mang theo cái {frozen} chết chóc.', outro: 'Đôi cánh Wyvern gãy gục. Núi đá lại {shine} dưới nắng.' },
  // Chương 4 — Hang rồng
  { monster: 'darkKnight', intro: 'Cửa hang rồng rực {fire} đỏ. Một Hiệp Sĩ Đen đứng gác, {silent} nhưng đầy sát khí, chắn lối vào {castle} cuối cùng của Oblivion.', outro: 'Hắn quỵ gối, giáp đen vỡ tan trên nền {stone}.' },
  { monster: 'youngDragon', intro: 'Một Rồng Con phun {fire} thử sức, đôi mắt còn ngây thơ nhưng {strength} đã rất đáng gờm.', outro: 'Nó cụp cánh, rút sâu vào bóng {dark} của hang.' },
  { monster: 'darkKnight', intro: 'Hiệp Sĩ Đen thứ hai canh giữ cây {tower} lửa, thề {protect} chủ nhân đến hơi thở cuối.', outro: 'Hắn ngã xuống, một tia {hope} nhỏ loé lên trong hang tối.' },
  { monster: 'youngDragon', intro: 'Rồng Con lớn hơn xuất hiện, gầm {loud} vang khắp vách hang, phun {fire} thành cột.', outro: 'Nó gục xuống bên đống {gold} lấp lánh, hơi thở dần {silent}.' },
  { monster: 'darkKnight', intro: 'Hiệp Sĩ Đen cuối cùng {brave} đối đầu một mình, dù biết {battle} này khó thắng.', outro: 'Hắn buông kiếm, thì thầm một lời {truth} trước khi biến mất.' },
  { monster: 'youngDragon', intro: 'Rồng Con cuối bầy gào lên giữa {night}, như đang gọi Oblivion tới giải cứu.', outro: 'Tiếng gào tắt lịm — chỉ còn tiếng {wind} rít qua hang sâu.' },
  { monster: 'oblivion', intro: 'Oblivion — Kẻ Nuốt Lời — hiện ra giữa {dust} và {fire}, đôi mắt chứa hàng ngàn từ đã {forget} bị hắn nuốt trọn qua bao thế kỷ.', outro: 'Oblivion tan vào {light}. Từng {word} bị đánh cắp bay trở lại muôn nơi — Lexoria được {save}.' }
];
