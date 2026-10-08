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
}

const SPECIAL = { Wukong: 'MonkeyKing', "Cho'Gath": 'Chogath', "Kha'Zix": 'Khazix', "Kai'Sa": 'Kaisa', "Rek'Sai": 'RekSai',
  "Bel'Veth": 'Belveth', "Vel'Koz": 'Velkoz', "Kog'Maw": 'KogMaw', "K'Sante": 'KSante', LeBlanc: 'Leblanc', 'Nunu & Willump': 'Nunu', 'Renata Glasc': 'Renata' }
const toId = (n) => SPECIAL[n] ?? n.replace(/[^A-Za-z0-9]/g, '')
const r1 = (x) => Math.round(x * 10) / 10

const out = { updated: new Date().toISOString(), source: 'op.gg (EUW ranked, current season)', players: {} }
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
    solo: { tier, division, lp, wins: p.total[1], losses: p.total[0] - p.total[1] }, flex: null,
    games: p.total[0], wins: p.total[1], lanes: {}, champions, mastery: [],
  }
}
writeFileSync('public/stats.json', JSON.stringify(out, null, 1) + '\n')
console.log('wrote public/stats.json', Object.entries(out.players).map(([k, v]) => `${k}:${Object.keys(v.champions).length}`).join(' '))
