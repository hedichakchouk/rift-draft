// Converts champion tables copied from op.gg (EUW, ranked season) into public/stats.json.
// Row format per champion: Name,games,wins,avgKills,avgDeaths,avgAssists  (champions with >= 2 games)
// Refresh: re-read op.gg/lol/summoners/euw/<Name>-<TAG>/champions and update the RAW block below.
import { writeFileSync } from 'node:fs'

const RAW = {
  Hach: { riotId: 'hach#1710', rank: ['DIAMOND', 'I', 50], total: [512, 272],
    champs: 'Braum,71,48,1.3,4.6,17.6;Janna,58,31,1,4.7,14.9;Thresh,43,22,1.7,5.7,14.7;Lulu,34,20,0.6,4.8,16.3;Leona,34,16,1.1,6.3,13.5;Zac,26,13,3.6,4.5,12.4;Nautilus,24,12,1.9,7.2,16.5;Karma,17,7,1.2,5.4,15.8;Milio,15,8,0.8,4.1,15.9;Alistar,15,7,1.4,6.4,13.7;Rell,15,7,1.4,5.9,16.7;Seraphine,13,7,2,4.6,13.2;Zilean,11,4,2.6,4.7,17.9;Blitzcrank,10,7,1.5,4.4,14.7;Samira,10,7,11.5,5.3,6.6;Maokai,10,6,2.2,6.9,16.9;Sion,10,5,3.7,5.1,5.4;Nocturne,9,6,7.6,4.4,13.7;Nami,9,5,1.4,5.9,14.3;Neeko,8,7,2.3,5.6,12.8;Tahm Kench,7,3,2.3,6.4,11.7;Caitlyn,6,2,6.7,6.5,3.5;Ahri,5,4,6.4,4.4,4;Lux,4,2,9.5,9.3,18.5;Swain,4,2,4,6.5,12;Elise,3,1,5.3,8.7,11.3;Jarvan IV,3,1,6.7,5,11.7;Xerath,3,1,4.7,4,10;Veigar,3,1,4.7,9.7,14;Rakan,3,0,2,5,12.3;Sejuani,2,2,7,7.5,20;Soraka,2,2,0,3.5,20;Jhin,2,1,5,10.5,4.5;Ekko,2,0,5.5,7.5,4' },
  Bullet: { riotId: 'BulletProof#7050', rank: ['DIAMOND', 'II', 50], total: [426, 237],
    champs: 'Camille,117,70,8.3,6.2,6.3;Malphite,51,28,4.8,4.9,8.5;Ambessa,38,15,7.1,5.5,6.6;Zaahen,29,19,6.9,6.1,5.7;Jayce,27,15,7.9,6.1,6.9;Jax,27,14,7.2,6,5;Mordekaiser,23,14,5.9,6,4.6;Kled,20,12,8.8,4.1,8;Gwen,16,11,7.3,5.4,5.5;Sett,10,6,6.4,6.3,7.4;Sylas,7,5,7.3,4.9,9.3;Renekton,7,4,7.3,5.6,7.9;Varus,7,2,6.4,6.3,6.3;Kayle,5,1,6.6,7,5.6;Dr. Mundo,4,3,3.3,4.8,7.8;Veigar,4,2,10.5,9,8;Gragas,4,2,2.5,4.5,5.3;Volibear,4,1,5.3,8.8,4.5;Shen,3,2,2,3,9;Xin Zhao,3,2,8.3,3.3,5.3;Jarvan IV,2,2,8,5,14;Graves,2,1,10,6,10.5;Cho\'Gath,2,1,7,5,6.5;Ornn,2,1,4,6,13.5;Vladimir,2,0,1.5,5,2.5;Lissandra,2,0,5,8,4.5' },
  Aster: { riotId: 'BigBallsDragon#0001', rank: ['DIAMOND', 'II', 58], total: [547, 288],
    champs: 'Kayn,182,101,8.9,4.2,7.1;Diana,48,25,8.3,5,8.5;Xin Zhao,45,22,5.9,4.4,8.2;Jarvan IV,25,14,7.6,4.6,11.5;Vi,23,8,8.7,4.8,7.8;Bel\'Veth,22,13,8.4,4.6,8.2;Dr. Mundo,21,11,5,3.7,7.7;Ambessa,20,12,8.8,4.2,9.4;Kha\'Zix,13,7,8.5,3.2,4.5;Naafiri,13,7,10.3,4.9,7.2;Shyvana,10,6,7.8,3.1,6.8;Graves,9,5,10.1,5.8,8.8;Jhin,9,5,8.3,4.7,7.2;Jax,9,4,8,3.8,6.9;Viego,9,1,10.6,6.7,5.4;Elise,8,6,7.5,4.5,7.4;Sylas,7,5,8,4.7,7.6;Talon,6,3,9.7,5.5,8.2;Rek\'Sai,6,2,7.2,3.7,5.3;Gwen,5,4,6.6,6,9;Nocturne,5,3,7.2,4.4,5.6;Aurelion Sol,5,3,10.8,4.6,10;Nasus,5,2,8.6,3.4,7.6;Lillia,4,3,7.8,2.8,9.5;Jinx,4,3,7,4.3,7.5;Wukong,4,2,8.3,3,9.5;Cho\'Gath,4,2,7.3,4,7.8;Hecarim,4,1,9.3,5.8,15.5;Master Yi,4,1,7.5,5.5,2.8;Galio,3,2,6,4,6.7;Ahri,2,1,4.5,3,5.5;Volibear,2,0,4.5,7.5,12' },
  Hama: { riotId: 'Skyvanat#akali', rank: ['MASTER', 'I', 0], total: [643, 342],
    champs: 'Naafiri,97,50,11.1,6.6,6.1;Zed,96,61,11,5.4,5.9;Akali,79,49,11.6,6,5.1;Diana,55,37,10.8,6.2,6.5;Yone,41,22,8,6.8,5.2;Jinx,36,22,8.5,6.4,8.1;Kassadin,32,14,9,5.2,5.5;Sylas,31,14,10.1,7.3,7;Veigar,22,11,9.6,5.8,7.5;Ahri,22,9,8,5.7,7.2;Yasuo,19,9,8.2,6.4,5.5;Syndra,12,7,5.5,4.2,4.8;Viktor,11,8,7.7,5.2,9.7;Kai\'Sa,9,1,10.8,7.4,7.4;Vayne,8,5,10.4,6.9,8.6;Irelia,6,3,9,9,5;Tristana,6,2,11.3,6,5.8;Lissandra,5,3,5.4,5.2,9.6;Galio,5,3,3.4,6.4,13.6;Malzahar,5,2,5.6,6.8,6.8;Jhin,5,1,7.2,6.2,8.6;Smolder,4,2,11,6.5,9;Malphite,4,1,4.8,6.8,6.8;Ekko,3,1,5.7,5,4.3;Kayle,3,1,3,7,5;Gwen,3,1,7.3,9.3,4;Orianna,2,1,8,5.5,8.5;LeBlanc,2,0,11,4.5,4.5;Jax,2,0,2,9,1.5;Aurora,2,0,6,6.5,5.5;Vladimir,2,0,4.5,7.5,4.5' },
  Omar: { riotId: 'Meat Grinder#topG', rank: ['MASTER', 'I', 263], total: [2140, 1056],
    champs: 'Urgot,905,475,6.7,5.5,4.8;Lux,314,169,5.8,5.6,9.3;Sion,181,90,3.2,6,7.3;Naafiri,110,50,7.1,5.9,5.8;Malphite,95,43,3.7,5.5,6.1;Dr. Mundo,93,41,4.3,5.5,5.7;Pantheon,66,30,7.2,6,7.2;Nasus,62,22,3.7,5.8,5.9;Tahm Kench,38,13,3.2,5.6,6.8;Nocturne,35,15,5.1,6.8,8.4;Cho\'Gath,34,18,5.9,6.3,5.6;Kennen,24,10,4.5,6.4,5.7;Volibear,14,2,3.6,6.9,5.2;Zaahen,13,6,5.7,7.2,6.6;Mel,11,4,7.5,6.3,5;Brand,10,5,2.9,5.4,4.4;Shaco,9,8,9.3,6.4,15;Gragas,9,4,4.1,6.9,5.2;Sylas,8,6,8,8.4,10.9;Garen,8,3,6.8,6.6,2.9;Jhin,8,2,7,8.4,9.4;Mordekaiser,7,4,5.3,4.4,3.6;Braum,5,3,1,7.8,17.6;Miss Fortune,5,2,9.4,6,6.8;Ezreal,5,2,7.8,6.8,7;Amumu,5,0,2.8,7.4,9;Ziggs,4,4,7,6.5,13;Singed,3,3,6,7.3,6;Ivern,3,3,4.7,3,16;Gangplank,3,1,7.3,7.7,6.7;Syndra,3,1,7.3,5,6;Maokai,3,1,3,5.7,5.3;Jinx,3,1,7,5.3,8.7;Teemo,3,1,6.3,9.3,2.7;Galio,3,1,3.3,6,6.3;Zed,3,0,9.7,9.3,6;Kha\'Zix,2,2,10,7.5,7;Yasuo,2,1,4.5,9,6.5;Varus,2,1,9.5,11.5,12;Ekko,2,1,9.5,7,9.5' },
  Rapo: { riotId: 'Rapo#0302', rank: ['MASTER', 'I', 999], total: [1388, 715],
    champs: 'Ezreal,191,99,6.2,4.4,6.9;Caitlyn,174,90,7.4,5.7,6.4;Jinx,169,100,7.2,4.8,6.8;Aurora,150,83,6.9,4.1,6.5;Tristana,147,71,7.7,5.4,5.2;Kai\'Sa,100,54,8.5,5.2,6.2;Corki,74,37,8.3,5.3,6.7;Yunara,69,36,7.1,5.7,6;Syndra,65,32,5.1,4.9,6.6;Senna,44,19,4.3,5.6,14.3;Ashe,31,16,5.5,5.8,8.4;Varus,27,15,7.5,4.8,5.6;Sivir,23,12,5.1,4.9,8.4;Ziggs,22,13,5.1,5,7.7;Gnar,22,6,3.1,4.2,4;Jarvan IV,16,7,4.7,5.1,11.1;Smolder,13,5,6.2,5.8,5.8;Aphelios,13,4,4.8,6.8,4.5;Lucian,10,6,6.6,6.8,8.9;Xayah,9,4,8,5.7,5.8;Zeri,4,2,8.5,7,5.8;Rakan,3,1,0.7,6.7,17.7;Graves,3,1,8.7,5.3,4;Miss Fortune,2,0,11,7.5,2' },
}

// Current-season queues from op.gg (Ranked Solo/Duo, Ranked Flex, Ranked 5s). [tier, division, lp, wins, losses]
const RANKS = {
  Hach: { solo: ['DIAMOND', 'I', 50, 161, 153], flex: ['MASTER', '', 312, 101, 79], fives: ['DIAMOND', 'I', 6, 10, 9] },
  Bullet: { solo: ['DIAMOND', 'II', 50, 89, 69], flex: ['MASTER', '', 541, 135, 111], fives: ['DIAMOND', 'II', 60, 13, 13] },
  Aster: { solo: ['DIAMOND', 'II', 58, 144, 136], flex: ['GRANDMASTER', '', 736, 131, 112], fives: ['DIAMOND', 'II', 88, 13, 13] },
  Hama: { solo: ['MASTER', '', 0, 216, 210], flex: ['GRANDMASTER', '', 730, 125, 91], fives: null },
  Omar: { solo: ['MASTER', '', 263, 981, 1016], flex: ['DIAMOND', 'I', 76, 75, 74], fives: null },
  Rapo: { solo: ['MASTER', '', 999, 644, 623], flex: ['MASTER', '', 30, 59, 48], fives: ['DIAMOND', 'II', 8, 12, 13] },
}
const rk = (a) => (a ? { tier: a[0], division: a[1], lp: a[2], wins: a[3], losses: a[4] } : null)


const SPECIAL = { Wukong: 'MonkeyKing', "Cho'Gath": 'Chogath', "Kha'Zix": 'Khazix', "Kai'Sa": 'Kaisa', "Rek'Sai": 'RekSai',
  "Bel'Veth": 'Belveth', "Vel'Koz": 'Velkoz', "Kog'Maw": 'KogMaw', "K'Sante": 'KSante', LeBlanc: 'Leblanc', 'Nunu & Willump': 'Nunu', 'Renata Glasc': 'Renata' }
const toId = (n) => SPECIAL[n] ?? n.replace(/[^A-Za-z0-9]/g, '')
const r1 = (x) => Math.round(x * 10) / 10

const SQUAD = { 'Meat Grinder': 'Omar', BigBallsDragon: 'Aster', Skyvanat: 'Hama', Rapo: 'Rapo', hach: 'Hach', BulletProof: 'Bullet' }
// Last 5 squad flex games, read from op.gg match detail. Each row: champion,summoner,OP score,placement (MVP/ACE/1st..10th),K/D/A
const RAW_GAMES = [
  { age: '5 days ago', win: true, duration: '32:00',
    ours: "Cho'Gath,Meat Grinder,5.4,3rd,13/4/5;Kayn,Kayn S3ayed,5.6,MVP,13/5/8;Naafiri,Skyvanat,5.3,4th,14/9/7;Jinx,Rapo,3.6,8th,3/8/11;Lulu,hach,2.6,9th,1/14/18",
    enemy: 'Nasus,Thiccstar123,2.5,10th,2/5/4;Rengar,frenchcore,4.9,6th,14/9/7;Annie,Benny,5.4,ACE,16/10/6;Jhin,ZiccL,4.1,7th,6/9/11;Janna,Yukato,5.1,5th,2/11/26' },
  { age: '5 days ago', win: false, duration: '26:27',
    ours: 'Garen,Meat Grinder,4.8,ACE,5/5/0;Ambessa,BigBallsDragon,1.4,10th,1/9/3;Viktor,Skyvanat,2.4,8th,0/6/2;Sivir,Rapo,4.4,7th,2/3/2;Alistar,hach,2.1,9th,0/6/4',
    enemy: 'Renekton,LP EXCAVATOR 十,5.2,5th,3/3/4;Xin Zhao,Cangueco,10,MVP,6/0/16;Syndra,teumokis,10,3rd,11/1/5;Jinx,Khefu,9.6,4th,8/2/8;Thresh,Algorithm,10,2nd,1/2/20' },
  { age: '5 days ago', win: true, duration: '24:48',
    ours: "Pantheon,Meat Grinder,8.8,2nd,11/1/4;Cho'Gath,BigBallsDragon,6.3,4th,6/2/5;Diana,Skyvanat,8.3,3rd,8/1/6;Ezreal,Rapo,9.6,MVP,8/0/9;Leona,hach,5.8,5th,0/5/14",
    enemy: "Sion,Flütenskum,1.5,10th,1/8/1;Kha'Zix,Ulbinus,2.6,7th,4/9/4;Viktor,Bergholdt,2.4,8th,0/6/4;Caitlyn,Svampen,4.2,ACE,4/4/2;Karma,GarenTheMountain,1.7,9th,0/6/4" },
  { age: '5 days ago', win: true, duration: '37:22',
    ours: 'Sylas,BulletProof,3.3,7th,6/10/7;Ambessa,BigBallsDragon,7.4,3rd,10/3/14;Viktor,Skyvanat,8,2nd,16/5/11;Ezreal,Meat Grinder,7.2,4th,9/3/15;Milio,hach,8.6,MVP,3/5/31',
    enemy: "Malphite,selim5533,2.9,9th,2/10/10;Nocturne,lapo,3.2,8th,8/8/2;Vel'Koz,SQD Rumpel,1.8,10th,1/11/6;Tristana,Retus09,5.9,ACE,13/8/4;Lulu,Philae,4.1,6th,2/7/14" },
  { age: '5 days ago', win: true, duration: '33:16',
    ours: 'Jayce,BulletProof,7.6,MVP,11/5/11;Ambessa,BigBallsDragon,6.6,3rd,9/2/6;Diana,Skyvanat,7.3,2nd,10/9/13;Miss Fortune,Meat Grinder,3.9,7th,5/5/4;Rell,hach,6.2,4th,1/3/17',
    enemy: 'Ahri,Morcille,3.8,8th,7/10/5;Lee Sin,SinZuo,4.5,6th,4/3/6;Kled,Syrôko,1.8,10th,3/12/4;Akshan,Frosch,5.5,ACE,7/6/8;Camille,Ρaprika,3.3,9th,2/5/7' },
  { age: '5 days ago', win: true, duration: '27:49',
    ours: 'Jayce,BulletProof,5.1,5th,10/9/8;Ambessa,Kayn S3ayed,5.5,4th,4/3/12;Diana,Skyvanat,6.4,3rd,12/7/9;Lucian,Rapo,6.5,2nd,11/4/9;Nami,hach,7,MVP,3/3/21',
    enemy: 'Swain,당신은 괴물이에요,2.7,10th,2/10/9;Lee Sin,Canyon,3.5,8th,8/12/9;Kennen,JuStFiXeDmEnT4L,4.4,7th,5/7/10;Tristana,c0raw,4.9,ACE,10/6/3;Milio,The Magical Cat,3.1,9th,1/5/10' },
  { age: '5 days ago', win: true, duration: '24:12',
    ours: 'Jax,BulletProof,5,6th,7/2/3;Ambessa,Kayn S3ayed,6.8,2nd,5/1/10;Akali,Skyvanat,8.7,MVP,17/3/5;Lucian,Rapo,5.5,3rd,8/8/9;Milio,hach,5.5,4th,0/5/18',
    enemy: 'Tryndamere,Ultramanodyna,2.1,9th,3/6/0;Hecarim,草莓牛奶,2.7,8th,4/7/3;Yone,Olive Leaf,0.1,10th,0/10/0;Yunara,Lee Sin nob,3.9,7th,7/9/5;Yuumi,落日晚风,5,ACE,5/5/10' },
  { age: '5 days ago', win: false, duration: '25:43',
    ours: 'Camille,BulletProof,3.6,9th,4/9/4;Diana,BigBallsDragon,5.4,ACE,6/5/6;Yasuo,Skyvanat,3.7,8th,4/5/3;Yunara,Rapo,4.1,7th,6/8/3;Lulu,hach,4.6,6th,0/5/12',
    enemy: 'Sion,당신은 괴물이에요,6.5,4th,4/6/14;Talon,Canyon,8.5,3rd,7/4/14;Kennen,JuStFiXeDmEnT4L,3.5,10th,4/8/4;Tristana,c0raw,10,MVP,17/1/6;Yuumi,The Magical Cat,9.7,2nd,0/1/24' },
  { age: '5 days ago', win: false, duration: '32:16',
    ours: "Zaahen,BulletProof,3,10th,5/8/5;Cho'Gath,BigBallsDragon,5,ACE,8/5/7;Zed,Skyvanat,3.5,8th,5/7/6;Aphelios,Rapo,4.1,7th,6/7/7;Thresh,hach,3.2,9th,1/7/12",
    enemy: 'Olaf,AngryMThaii,5,5th,6/6/9;Hecarim,TranLoi,6.6,2nd,8/5/12;Zoe,m chan bố m đi,6.6,MVP,12/4/8;Caitlyn,Kos Subin,6.4,3rd,6/4/12;Alistar,Hi Im Quânn,6.3,4th,2/6/21' },
  { age: '6 days ago', win: true, duration: '50:01',
    ours: 'Urgot,Meat Grinder,6,MVP,24/12/7;Kayn,BigBallsDragon,4.1,8th,10/13/11;Viktor,Skyvanat,5.8,3rd,11/8/15;Tristana,Rapo,3,10th,6/14/7;Janna,hach,3.6,9th,0/10/21',
    enemy: 'Gnar,Arhi COMAGIQUE,4.8,7th,12/12/13;Shaco,ExDaMiR,4.9,6th,8/9/16;Zed,Funky,5.1,5th,19/13/7;Syndra,Khefu,6.1,ACE,17/7/11;Thresh,Samo el fuego,5.2,4th,1/10/30' },
]
const grade = (s) => (s >= 7.5 ? 'S' : s >= 6 ? 'A' : s >= 4.5 ? 'B' : s >= 3 ? 'C' : 'D')
const parseRow = (r, mine) => { const [champ, name, op, place, kda] = r.split(','); const [k, d, a] = kda.split('/').map(Number)
  const p = { champ: toId(champ), name: mine && SQUAD[name] ? SQUAD[name] : name, op: +op, place, grade: place === 'MVP' || place === 'ACE' ? 'S' : grade(+op), k, d, a }
  if (mine && SQUAD[name]) p.squad = true
  return p }
const FLEX_GAMES = RAW_GAMES.map((g) => {
  const ours = g.ours.split(';').map((r) => parseRow(r, true)), enemy = g.enemy.split(';').map((r) => parseRow(r, false))
  const best = [...ours, ...enemy].find((p) => p.place === (g.win ? 'MVP' : 'ACE')) ?? null
  const mvp = [...ours, ...enemy].find((p) => p.place === 'MVP') ?? null, ace = [...ours, ...enemy].find((p) => p.place === 'ACE') ?? null
  return { age: g.age, win: g.win, duration: g.duration, ours, enemy, mvp: mvp && { name: mvp.name, champ: mvp.champ, ours: ours.includes(mvp) }, ace: ace && { name: ace.name, champ: ace.champ, ours: ours.includes(ace) },
    kills: [ours, enemy].map((t) => t.reduce((s, p) => s + p.k, 0)), members: ours.filter((p) => p.squad).map((p) => [p.name, p.champ]) }
})

const out = { updated: new Date().toISOString(), source: 'op.gg (EUW ranked, current season)', flexGames: FLEX_GAMES, players: {} }
for (const [name, p] of Object.entries(RAW)) {
  const champions = {}
  for (const row of p.champs.split(';')) {
    const [n, g, w, k, d, a] = row.split(',')
    const games = +g
    champions[toId(n)] = { games, wins: +w, kills: r1(+k * games), deaths: r1(+d * games), assists: r1(+a * games), cs: 0, minutes: 0 }
  }
  const [tier, division, lp] = p.rank
  out.players[name] = {
    riotId: p.riotId, level: null,
    solo: rk(RANKS[name].solo), flex: rk(RANKS[name].flex), fives: rk(RANKS[name].fives),
    games: p.total[0], wins: p.total[1], lanes: {}, champions, mastery: [],
  }
}
writeFileSync('public/stats.json', JSON.stringify(out, null, 1) + '\n')
console.log('wrote public/stats.json', Object.entries(out.players).map(([k, v]) => `${k}:${Object.keys(v.champions).length}`).join(' '))
