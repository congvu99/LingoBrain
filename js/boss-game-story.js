/* Game Pháp Sư Lexoria — DỮ LIỆU THUẦN: 4 vùng đất, 12 quái, 28 đoạn truyện (index = beat).
   Không có hàm ở đây (chỉ literal) — logic tra cứu (theo beat/wins) nằm ở boss-game-story-journal-ui.js.
   '{id}' trong intro/outro = từ tiếng Anh có thật trong words.json (kiểm bằng tests/boss-game-story.test.js);
   đã học → tô màu + bấm nghe (storySegments ở boss-game-progress.js). weak ∈ BOSS_ELEMENTS (boss-progress-sync-merge.js).
   Khắc hệ theo brainstorm: ch.1 sợ 🔥 fire · ch.2 🌿 earth · ch.3 ❄️ ice · ch.4 ⚡ storm (CHỈ áp cho trùm chương;
   quái thường có thể khác hệ để đa dạng — ghi ở từng quái). hpMul: quái thường 1 (≈ BOSS_TUNING.hp.minion), trùm 2 (≈ .boss).
   clockMul: hệ số tốc độ nạp đòn của quái đó (tư liệu cho vòng cân bằng sau — chưa được boss-game-logic.js đọc).
   `sprite` = khoá trong BOSS_SPRITES (boss-game-sprite-atlas.js); `spriteHit`/`spriteAttack` chỉ trùm có sheet Hit/Attack
   thật (xem boss-game-sprite-actors.js). `shape` GIỮ LẠI chỉ để boss-game-story-journal-ui.js suy ra emoji dự phòng
   (BOSS_SHAPE_EMOJI) — không còn dùng để vẽ (phase 5 mới bỏ khi gỡ BOSS_SHAPE_EMOJI). */

const BOSS_REGIONS = [
  { id: 'ashford', name: 'Làng Ashford' },
  { id: 'catacombs', name: 'Hầm mộ' },
  { id: 'cliffs', name: 'Núi đá' },
  { id: 'dragonlair', name: 'Hang rồng' }
];

const BOSS_MONSTERS = [
  { id: 'goblin', name: 'Slime Xanh', sprite: 'slime', shape: 'humanoid', region: 'ashford', size: 0.85, weak: 'fire', hpMul: 1, clockMul: 1 },
  { id: 'wolf', name: 'Gấu Mèo Cướp', sprite: 'racoon', shape: 'beast', region: 'ashford', size: 0.9, weak: 'storm', hpMul: 1, clockMul: 1 },
  { id: 'goblinKing', name: 'Vua Gấu Mèo', sprite: 'giantRacoon', spriteAttack: 'giantRacoonAttack', shape: 'humanoid',
    region: 'ashford', size: 1.35, weak: 'fire', hpMul: 2, clockMul: 0.85 },
  { id: 'skeleton', name: 'Đầu Lâu', sprite: 'skull', shape: 'humanoid', region: 'catacombs', size: 0.9, weak: 'earth', hpMul: 1, clockMul: 1 },
  { id: 'ghost', name: 'Hồn Ma', sprite: 'spirit', shape: 'wraith', region: 'catacombs', size: 1, weak: 'storm', hpMul: 1, clockMul: 1 },
  { id: 'lich', name: 'Hồn Ma Chúa', sprite: 'giantSpirit', spriteHit: 'giantSpiritHit', shape: 'humanoid',
    region: 'catacombs', size: 1.3, weak: 'earth', hpMul: 2, clockMul: 0.85 },
  { id: 'troll', name: 'Chuột Chũi Đá', sprite: 'mole', shape: 'humanoid', region: 'cliffs', size: 1.2, weak: 'ice', hpMul: 1, clockMul: 1.1 },
  { id: 'harpy', name: 'Cú Đêm', sprite: 'owl', shape: 'flyer', region: 'cliffs', size: 0.95, weak: 'fire', hpMul: 1, clockMul: 0.9 },
  { id: 'wyvern', name: 'Thiên Cẩu', sprite: 'tenguBlue', spriteHit: 'tenguBlueHit', spriteAttack: 'tenguBlueAttack', shape: 'flyer',
    region: 'cliffs', size: 1.4, weak: 'ice', hpMul: 2, clockMul: 0.85 },
  { id: 'darkKnight', name: 'Linh Hồn Lửa', sprite: 'flamMonster', shape: 'humanoid', region: 'dragonlair', size: 1.1, weak: 'ice', hpMul: 1, clockMul: 1 },
  { id: 'youngDragon', name: 'Rồng Con', sprite: 'youngDragon', shape: 'dragon', region: 'dragonlair', size: 1.15, weak: 'storm', hpMul: 1, clockMul: 0.95 },
  { id: 'oblivion', name: 'Oblivion', sprite: 'oblivion', shape: 'dragon', region: 'dragonlair', size: 1.8, weak: 'storm', hpMul: 2, clockMul: 0.8 }
];

/* 28 đoạn (beat 0..27) — 7 trận/chương (6 quái thường + 1 trùm); monster = id trong BOSS_MONSTERS. */
const BOSS_STORY = [
  // Chương 1 — Làng Ashford
  { monster: 'goblin', intro: 'Từ vực sâu Lexoria, rồng Oblivion vừa {wake}, hơi thở của hắn nuốt lấy từng {word} còn sót lại trong ký ức loài người. Ánh {light} cuối ngày tắt dần trên mái nhà Ashford — một Slime Xanh lẻn vào sân kho, mắt đỏ rực trong bóng tối.', outro: 'Slime Xanh tan thành khói, để lại một rune sáng. Ngôi làng lấy lại chút {hope}.' },
  { monster: 'wolf', intro: 'Tiếng {storm} xa xa hoà cùng tiếng gầm của Gấu Mèo Cướp. Nó rình rập quanh giếng làng, chờ ai đó mất cảnh giác. Bạn giơ trượng, sẵn sàng cho {battle}.', outro: 'Gấu Mèo Cướp ngã quỵ dưới ánh phép. Dân làng thở phào, {return} về nhà an toàn.' },
  { monster: 'goblin', intro: 'Một bầy Slime Xanh khác kéo tới, đông hơn và {brave} hơn lần trước. Chúng đã đánh hơi được rune vừa hồi sinh.', outro: 'Chiến thắng nhỏ, nhưng mỗi rune giành lại là một {word} cứu được.' },
  { monster: 'wolf', intro: 'Đêm nay {cold} hơn thường lệ — dấu hiệu Oblivion đang lan rộng bóng tối. Một con Gấu Mèo Cướp khác gầm gừ giữa {forest} rìa làng.', outro: 'Bạn {win}, và khu rừng như sáng lên đôi chút.' },
  { monster: 'goblin', intro: 'Slime Xanh lần này mang theo {stone} nhọn làm vũ khí, liều lĩnh {attack} bất kỳ ai lại gần kho thóc.', outro: 'Nó bỏ chạy tán loạn — dân Ashford tạm yên {sleep} qua đêm.' },
  { monster: 'wolf', intro: 'Gấu Mèo Cướp đầu đàn xuất hiện, to lớn và {strong} hơn cả, mắt nó không còn tia sáng nào của sự sống.', outro: 'Bạn hạ nó trong tiếng {breath} dồn dập — một trận đánh không dễ dàng.' },
  { monster: 'goblinKing', intro: 'Vua Gấu Mèo bước ra từ {tower} đổ nát, đội {gold} vương miện cướp được. Hắn hét lên, thách thức pháp sư trẻ giữ lấy ngôi làng.', outro: 'Vương miện vỡ tan. Ashford được {save} — nhưng Oblivion vẫn còn xa lắm.' },
  // Chương 2 — Hầm mộ
  { monster: 'skeleton', intro: 'Dưới lòng đất, hành lang {ancient} dẫn vào hầm mộ tối tăm. Một Đầu Lâu trỗi dậy, giáo mác kêu lạch cạch trong bóng {silent}.', outro: 'Đầu Lâu vỡ vụn thành {dust}. Con đường vào sâu hơn đã mở.' },
  { monster: 'ghost', intro: 'Một Hồn Ma lướt qua, thì thầm những {memory} bị lãng quên. Nó muốn kéo bạn vào cõi {loss} cùng nó.', outro: 'Ánh phép xua tan hồn ma. Một tiếng {voice} nhỏ cảm ơn vọng lại rồi biến mất.' },
  { monster: 'skeleton', intro: 'Thêm nhiều Đầu Lâu canh giữ cánh cửa {stone}, như thể chúng sợ ai đó tìm ra bí mật bên trong.', outro: 'Bạn bước qua xác chúng, tiến gần hơn tới {secret} của hầm mộ.' },
  { monster: 'ghost', intro: 'Tiếng {shout} vọng khắp hành lang — hồn ma giận dữ vì bị quấy rầy giấc {sleep} ngàn năm.', outro: 'Nó tan biến trong ánh sáng, để lại cảm giác {quiet} lạ thường.' },
  { monster: 'skeleton', intro: 'Một Đầu Lâu {strong} hơn đứng chắn lối, có vẻ từng là hiệp sĩ canh gác nơi này.', outro: 'Nó gục xuống, rune xương vỡ vụn để lại thêm {memory} về trận chiến này.' },
  { monster: 'ghost', intro: 'Hồn Ma cuối cùng trông {lonely} đến lạ, như đang chờ ai đó giải thoát nó khỏi hầm mộ.', outro: 'Nó mỉm cười — nếu hồn ma có thể — trước khi tan vào {light}.' },
  { monster: 'lich', intro: 'Hồn Ma Chúa ngồi trên ngai làm từ {bone}, đôi tay toả ra {power} u ám, đôi mắt xanh biếc xuyên thấu bóng tối.', outro: 'Hồn Ma Chúa tan vào {dust}. Hầm mộ chìm trong vẻ {silent} ngàn năm.' },
  // Chương 3 — Núi đá
  { monster: 'troll', intro: 'Đường lên Núi đá gập ghềnh, gió {wind} lạnh buốt cắt da. Một con Chuột Chũi Đá khổng lồ chặn {road}, gầm lên hung tợn.', outro: 'Chuột Chũi Đá ngã quỵ, để bạn tiếp tục {journey} lên cao.' },
  { monster: 'harpy', intro: 'Một con Cú Đêm lao xuống từ vách đá, móng vuốt sắc như muốn xé toạc {hope} còn sót lại.', outro: 'Nó bay đi trong hoảng loạn, bỏ lại một chiếc {wing} rơi xuống vực.' },
  { monster: 'troll', intro: 'Chuột Chũi Đá thứ hai to hơn, mang theo {rock} làm vũ khí, quyết {protect} hang ổ của bầy đàn.', outro: 'Bạn {win} sau một trận giằng co dài.' },
  { monster: 'harpy', intro: 'Bầy Cú Đêm kêu {loud} trên đỉnh núi, báo hiệu có kẻ lạ xâm nhập lãnh thổ của chúng.', outro: 'Tiếng kêu tắt dần, chỉ còn {quiet} bao trùm vách núi.' },
  { monster: 'troll', intro: 'Một Chuột Chũi Đá {dangerous} hơn hẳn đứng gác cửa hang, cơ bắp cuồn cuộn dưới lớp da xám.', outro: 'Nó gục xuống — bạn tiến thêm một bước gần hơn tới đỉnh {mountain}, nơi Thiên Cẩu ngự trị.' },
  { monster: 'harpy', intro: 'Cú Đêm chúa canh giữ tổ đá cao nhất, không để ai {escape} khỏi tầm mắt sắc bén của nó.', outro: 'Bạn hạ nó, giành lại một rune quý giá giữa {mountain}.' },
  { monster: 'wyvern', intro: 'Thiên Cẩu xoè cánh giữa những đám mây {cold}, hơi thở của nó mang theo cái {frozen} chết chóc.', outro: 'Đôi cánh Thiên Cẩu gãy gục. Núi đá lại {shine} dưới nắng.' },
  // Chương 4 — Hang rồng
  { monster: 'darkKnight', intro: 'Cửa hang rồng rực {fire} đỏ. Một Linh Hồn Lửa đứng gác, {silent} nhưng đầy sát khí, chắn lối vào {castle} cuối cùng của Oblivion.', outro: 'Nó tan thành tro, để lại vệt lửa mờ trên nền {stone}.' },
  { monster: 'youngDragon', intro: 'Một Rồng Con phun {fire} thử sức, đôi mắt còn ngây thơ nhưng {strength} đã rất đáng gờm.', outro: 'Nó cụp cánh, rút sâu vào bóng {dark} của hang.' },
  { monster: 'darkKnight', intro: 'Linh Hồn Lửa thứ hai canh giữ cây {tower} lửa, thề {protect} chủ nhân đến hơi thở cuối.', outro: 'Nó lụi tàn, một tia {hope} nhỏ loé lên trong hang tối.' },
  { monster: 'youngDragon', intro: 'Rồng Con lớn hơn xuất hiện, gầm {loud} vang khắp vách hang, phun {fire} thành cột.', outro: 'Nó gục xuống bên đống {gold} lấp lánh, hơi thở dần {silent}.' },
  { monster: 'darkKnight', intro: 'Linh Hồn Lửa cuối cùng {brave} đối đầu một mình, dù biết {battle} này khó thắng.', outro: 'Nó lụi tàn, thì thầm một lời {truth} trước khi biến mất.' },
  { monster: 'youngDragon', intro: 'Rồng Con cuối bầy gào lên giữa {night}, như đang gọi Oblivion tới giải cứu.', outro: 'Tiếng gào tắt lịm — chỉ còn tiếng {wind} rít qua hang sâu.' },
  { monster: 'oblivion', intro: 'Oblivion — Kẻ Nuốt Lời — hiện ra giữa {dust} và {fire}, đôi mắt chứa hàng ngàn từ đã {forget} bị hắn nuốt trọn qua bao thế kỷ.', outro: 'Oblivion tan vào {light}. Từng {word} bị đánh cắp bay trở lại muôn nơi — Lexoria được {save}.' }
];
