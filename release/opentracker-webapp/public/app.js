"use strict";
/* ---- data/data.js ---- */
/* Open Tracker prototype data. Locations are approximate centre points of areas named in
   published flood reports (see each event's source). Built 17 Oct 2026. */
const FT = {};

FT.builtOn = "2026-10-17";

/* Regions (Ghana) and states (Nigeria): id, country, name, centre [lon, lat] */
FT.areas = [
  ["GH-AA","GH","Greater Accra",[-0.20,5.65]],["GH-CP","GH","Central",[-1.25,5.40]],
  ["GH-WP","GH","Western",[-2.05,5.30]],["GH-WN","GH","Western North",[-2.49,6.21]],
  ["GH-EP","GH","Eastern",[-0.45,6.40]],["GH-AH","GH","Ashanti",[-1.62,6.69]],
  ["GH-BO","GH","Bono",[-2.33,7.34]],["GH-BE","GH","Bono East",[-1.94,7.59]],
  ["GH-AF","GH","Ahafo",[-2.52,6.80]],["GH-TV","GH","Volta",[0.47,6.60]],
  ["GH-OT","GH","Oti",[0.18,8.07]],["GH-NP","GH","Northern",[-0.84,9.40]],
  ["GH-SV","GH","Savannah",[-1.82,9.08]],["GH-NE","GH","North East",[-0.37,10.53]],
  ["GH-UE","GH","Upper East",[-0.85,10.79]],["GH-UW","GH","Upper West",[-2.50,10.06]],
  ["NG-AB","NG","Abia",[7.57,5.64]],["NG-AD","NG","Adamawa",[12.33,9.43]],["NG-AK","NG","Akwa Ibom",[7.81,4.92]],
  ["NG-AN","NG","Anambra",[6.97,6.18]],["NG-BA","NG","Bauchi",[9.68,10.42]],["NG-BY","NG","Bayelsa",[6.05,4.71]],
  ["NG-BE","NG","Benue",[8.85,7.46]],["NG-BO","NG","Borno",[13.27,11.97]],["NG-CR","NG","Cross River",[8.44,5.62]],
  ["NG-DE","NG","Delta",[5.73,5.48]],["NG-EB","NG","Ebonyi",[8.03,6.27]],["NG-ED","NG","Edo",[6.19,6.81]],
  ["NG-EK","NG","Ekiti",[5.30,7.70]],["NG-EN","NG","Enugu",[7.40,6.51]],["NG-FC","NG","FCT (Abuja)",[7.14,8.78]],
  ["NG-GO","NG","Gombe",[11.23,10.40]],["NG-IM","NG","Imo",[7.05,5.50]],["NG-JI","NG","Jigawa",[9.57,12.33]],
  ["NG-KD","NG","Kaduna",[7.84,10.51]],["NG-KN","NG","Kano",[8.53,11.75]],["NG-KT","NG","Katsina",[7.55,12.65]],
  ["NG-KE","NG","Kebbi",[4.09,11.84]],["NG-KO","NG","Kogi",[6.56,7.77]],["NG-KW","NG","Kwara",[4.83,8.61]],
  ["NG-LA","NG","Lagos",[3.40,6.52]],["NG-NA","NG","Nasarawa",[8.07,8.57]],["NG-NI","NG","Niger",[5.58,9.76]],
  ["NG-OG","NG","Ogun",[3.46,7.03]],["NG-ON","NG","Ondo",[5.23,7.15]],["NG-OS","NG","Osun",[4.54,7.50]],
  ["NG-OY","NG","Oyo",[3.54,8.16]],["NG-PL","NG","Plateau",[9.65,9.00]],["NG-RI","NG","Rivers",[6.85,4.89]],
  ["NG-SO","NG","Sokoto",[5.31,13.13]],["NG-TA","NG","Taraba",[10.62,7.90]],["NG-YO","NG","Yobe",[11.55,12.29]],
  ["NG-ZA","NG","Zamfara",[6.28,12.16]]
].map(([id,c,n,ll])=>({id,c,n,ll}));

FT.countries = {
  GH:{n:"Ghana",ll:[-1.0,7.9],z:5.6,unit:"region",units:"regions",dist:"district (MMDA)"},
  NG:{n:"Nigeria",ll:[8.1,9.1],z:4.9,unit:"state",units:"states",dist:"LGA"}
};

/* Typical monthly rain (mm, Jan..Dec), approximate climate averages per zone */
FT.climate = {
  acc:{n:"Accra coast",m:[15,30,60,85,131,221,50,20,50,70,35,20]},
  cc:{n:"Cape Coast coast",m:[20,40,90,120,230,300,90,40,70,120,60,25]},
  ksi:{n:"Ashanti and middle belt",m:[20,60,130,140,180,220,120,80,170,160,60,25]},
  ngh:{n:"Northern Ghana",m:[2,5,40,80,110,140,150,200,220,90,10,5]},
  vol:{n:"Lower Volta",m:[20,40,80,110,150,200,60,30,60,90,40,20]},
  wgh:{n:"Western Ghana",m:[40,70,140,160,220,250,120,80,130,180,110,60]},
  lag:{n:"Lagos",m:[30,45,100,150,200,300,180,70,180,150,60,20]},
  sen:{n:"Southern Nigeria and Delta",m:[40,80,170,240,300,370,380,330,380,300,140,50]},
  mid:{n:"Middle belt of Nigeria",m:[5,15,50,110,170,190,200,230,240,120,10,2]},
  nng:{n:"Northern Nigeria",m:[0,0,2,10,40,80,160,220,110,15,0,0]}
};

/* Dams and river systems. season = typical chance (0..1) of high water or releases, Jan..Dec,
   drawn from the pattern of past release reports (approximate). */
FT.dams = [
  {id:"weija",n:"Weija Dam",river:"Densu",c:"GH",ll:[-0.34,5.57],op:"Ghana Water Ltd",
   season:[.3,.3,.3,.6,.6,.6,.6,.6,.6,.6,.6,.3],note:"Spilling continuously since April 2025, according to Ghana Water Ltd."},
  {id:"akosombo",n:"Akosombo and Kpong dams",river:"Lower Volta",c:"GH",ll:[0.06,6.30],op:"Volta River Authority",
   season:[0,0,0,0,0,0,0,.05,.3,.3,.2,0],note:"Controlled spillage 15 Sep to 1 Nov 2023 displaced 26,000+ people."},
  {id:"bagre",n:"Bagre Dam (Burkina Faso)",river:"White Volta",c:"GH",ll:[-0.55,11.47],op:"SONABEL, relayed by Water Resources Commission",
   season:[0,0,0,0,0,0,.1,.7,.7,.2,0,0],note:"Usually spills in August or September. Water takes 48 to 78 hours to reach Ghana."},
  {id:"lagdo",n:"Lagdo Dam (Cameroon)",river:"Benue",c:"NG",ll:[13.67,9.06],op:"Cameroon, notified under the 2016 MoU",
   season:[0,0,0,0,0,0,.2,.5,.7,.6,.2,0],note:"Releases flood states along the Benue down to the Niger Delta."},
  {id:"niger",n:"Kainji, Jebba and Shiroro dams",river:"Niger",c:"NG",ll:[4.61,9.86],op:"Dam operators, tracked by NIHSA and NEMA",
   season:[0,0,0,0,0,.1,.2,.4,.6,.6,.3,0],note:"Releases meet Benue water at the Lokoja confluence."},
  {id:"oyan",n:"Oyan Dam",river:"Ogun",c:"NG",ll:[3.26,7.26],op:"Ogun-Osun River Basin Development Authority",
   season:[0,0,0,0,0,.1,.3,.3,.5,.6,.4,.1],note:"Released 1,484.2 million m³ by 12 Oct 2024; the Ogun drains into Lagos Lagoon."},
  {id:"alau",n:"Alau Dam",river:"Ngadda",c:"NG",ll:[13.25,11.73],op:"Borno State",
   season:[0,0,0,0,0,0,.2,.3,.3,.1,0,0],note:"Collapsed on 10 Sep 2024, flooding much of Maiduguri."}
];

FT.damStatus = {
  season:{n:"Typical for the season",p:null},
  normal:{n:"Normal",p:.05},
  alert:{n:"On alert",p:.4},
  release:{n:"Releasing water",p:.8},
  major:{n:"Major release",p:.95}
};

/* Hotspots.
   d: drivers (rain, river, coast, dam id); z: climate zone; sev,exp: 1..3; vul: 0..1;
   t: rain over 3 days (mm) that usually starts flooding here. */
const H = (id,n,c,r,lat,lon,o)=>Object.assign({id,n,c,r,ll:[lon,lat],d:["rain"],z:"acc",sev:2,exp:2,vul:.5,t:70,aka:[]},o);
FT.hotspots = [
  /* Greater Accra: Odaw basin */
  H("circle","Kwame Nkrumah Circle","GH","GH-AA",5.570,-0.217,{sev:3,exp:3,t:45,aka:["Circle","Nkrumah Interchange"],basin:"odaw",why:"The Odaw channel and open drains overflow here in heavy rain."}),
  H("adabraka","Adabraka and Odawna","GH","GH-AA",5.563,-0.211,{sev:3,exp:3,t:45,aka:["Odawna","Odorna","Adabraka Official Town"],basin:"odaw",why:"Low ground beside the Odaw; homes flood when the river spills."}),
  H("alajo","Alajo","GH","GH-AA",5.592,-0.218,{sev:3,exp:3,vul:.6,t:45,basin:"odaw",why:"Riverside homes on the Odaw; three people died by electrocution here in June 2026."}),
  H("avenor","Avenor","GH","GH-AA",5.583,-0.223,{sev:2,exp:3,t:50,basin:"odaw",why:"Low-lying land along the Odaw."}),
  H("kaneshie","Kaneshie","GH","GH-AA",5.567,-0.236,{sev:3,exp:3,t:45,aka:["Kaneshie Lorry Station","Kaneshie market"],basin:"odaw",why:"Floods almost every rainy season; drains cannot carry the water."}),
  H("abosseyokai","Abossey Okai","GH","GH-AA",5.557,-0.229,{sev:2,exp:3,t:50,basin:"odaw",why:"Low ground on the Odaw near Korle Lagoon."}),
  H("lartebiokorshie","Lartebiokorshie","GH","GH-AA",5.548,-0.238,{sev:2,exp:3,t:55,aka:["Lartey"],basin:"korle",why:"Listed by the Accra Metropolitan Assembly as flood-prone."}),
  H("oldfadama","Korle Lagoon and Old Fadama","GH","GH-AA",5.546,-0.222,{d:["rain","coast"],sev:2,exp:3,vul:.9,t:55,aka:["Korle","Agbogbloshie"],basin:"korle",why:"Informal settlement on the lagoon where the Odaw meets the sea."}),
  H("achimota","Achimota","GH","GH-AA",5.615,-0.230,{sev:2,exp:3,t:55,basin:"odaw",why:"Fast runoff from the upper Odaw basin."}),
  H("mallam","Mallam","GH","GH-AA",5.574,-0.289,{sev:2,exp:3,t:55,why:"Named among the worst-hit areas on 29 June 2026."}),
  H("dzorwulu","Dzorwulu","GH","GH-AA",5.611,-0.201,{sev:2,exp:2,t:60,basin:"odaw",why:"Flooded in the 2001 Accra floods."}),
  H("madina","Madina","GH","GH-AA",5.680,-0.166,{sev:2,exp:3,t:60,why:"Fast-growing area with undersized drains."}),
  H("adenta","Adenta","GH","GH-AA",5.708,-0.155,{sev:2,exp:3,t:60,why:"Two people died here in the May 2026 floods."}),
  H("gaeast","Ga East (Kwabenya and Dome)","GH","GH-AA",5.682,-0.236,{sev:2,exp:3,t:60,aka:["Kwabenya","Dome","Ga East"],basin:"odaw",why:"Three people died in Ga East in the May 2026 floods."}),
  /* Greater Accra: Densu and Weija */
  H("lowerweija","Lower Weija","GH","GH-AA",5.553,-0.336,{d:["rain","river","weija"],sev:3,exp:2,vul:.6,t:70,aka:["Weija"],basin:"densu",why:"Below the Weija Dam spillway; floods when the dam spills."}),
  H("tetegu","Tetegu","GH","GH-AA",5.560,-0.352,{d:["rain","river","weija"],sev:3,exp:2,vul:.7,t:70,aka:["Tetegu bridge"],basin:"densu",why:"Floods during Weija spillage; the bridge on the Accra–Kasoa road can be cut."}),
  H("oblogo","Oblogo","GH","GH-AA",5.561,-0.320,{d:["rain","river","weija"],sev:2,exp:2,vul:.6,t:75,basin:"densu",why:"Downstream of the Weija Dam."}),
  H("bojo","Bojo Beach and Ada Kope","GH","GH-AA",5.520,-0.356,{d:["river","coast","weija"],sev:2,exp:1,vul:.7,t:90,aka:["Ada Kope","Ada Kokpe"],basin:"densu",why:"At the Densu mouth, where spilled water meets the sea."}),
  H("mccarthy","Lower McCarthy Hill and Pambros","GH","GH-AA",5.555,-0.305,{d:["river","weija"],sev:2,exp:2,t:90,aka:["Pambros Salt","McCarthy Hill"],basin:"densu",why:"Listed by Ghana Water among areas hit by Weija spills."}),
  H("glefe","Glefe and Opetekwei","GH","GH-AA",5.531,-0.270,{d:["rain","coast","weija"],sev:2,exp:2,vul:.7,t:70,aka:["Opetekwei","Gbegbeyise"],why:"Homes flooded after Weija spillage in 2014."}),
  /* Greater Accra: east */
  H("tema","Tema","GH","GH-AA",5.669,-0.017,{sev:2,exp:3,t:65,why:"Flooded on 29 June 2026."}),
  H("ashaiman","Ashaiman","GH","GH-AA",5.694,-0.032,{sev:2,exp:3,vul:.6,t:65,why:"Dense settlement outside the main drainage programme."}),
  H("kpone","Kpone","GH","GH-AA",5.687,0.038,{d:["rain","coast"],sev:1,exp:2,t:80,why:"Lagoon and wetland edges."}),
  H("sakumono","Sakumono lagoon edge","GH","GH-AA",5.618,-0.045,{d:["rain","coast"],sev:1,exp:2,t:80,aka:["Sakumo"],why:"Building on the Sakumo wetland."}),
  /* Central: Kasoa */
  H("kasoa","Kasoa New Market","GH","GH-CP",5.535,-0.418,{sev:2,exp:3,t:60,aka:["Kasoa","Nyame Bekyere","Rock City","Bentum City","American Town","CP Last Stop","Ayigbe Town"],why:"Named by NADMO as flood-prone; rapid growth without main drains."}),
  /* Central: Cape Coast */
  H("abura","Abura and Abura Estate","GH","GH-CP",5.120,-1.262,{z:"cc",sev:3,exp:3,t:50,aka:["Abura New Site"],basin:"fosu",why:"Narrow old gutters take runoff from the hospital ridge."}),
  H("kotokuraba","Kotokuraba market","GH","GH-CP",5.107,-1.247,{z:"cc",sev:2,exp:3,t:55,aka:["Kotokuraba CBD"],basin:"fosu",why:"Traders' shops flood in heavy downpours."}),
  H("pedu","Pedu","GH","GH-CP",5.124,-1.271,{z:"cc",sev:2,exp:2,t:55,aka:["Pedu Total"],basin:"fosu",why:"Buildings on watercourses push water into homes."}),
  H("adisadel","Adisadel Estate","GH","GH-CP",5.115,-1.255,{z:"cc",sev:2,exp:2,t:55,basin:"fosu",why:"A blocked watercourse flooded offices here."}),
  H("eyifua","Eyifua","GH","GH-CP",5.114,-1.270,{z:"cc",sev:2,exp:2,t:55,aka:["PPAG"],basin:"fosu",why:"Repeatedly named in Cape Coast flood reports."}),
  H("stadium","Cape Coast Stadium and ECG enclave","GH","GH-CP",5.118,-1.256,{z:"cc",sev:2,exp:2,t:55,aka:["Oguaa Stadium","ECG"],basin:"fosu",why:"Stagnant water stays long after the rain stops."}),
  H("ucc","University of Cape Coast area","GH","GH-CP",5.115,-1.291,{z:"cc",sev:2,exp:3,t:60,aka:["UCC","Amamoma","Duakor"],basin:"kakum",why:"Parts of campus flood; UCC warned students to avoid them in June 2026."}),
  H("kakumdo","Kakumdo and Apewosika","GH","GH-CP",5.105,-1.302,{z:"cc",sev:2,exp:2,t:60,aka:["Kakomdo","Apewosika","Effutu"],basin:"kakum",why:"Low-lying areas near the Kakum estuary."}),
  H("nkanfoa","Nkanfoa and OLA","GH","GH-CP",5.130,-1.232,{z:"cc",sev:2,exp:2,t:60,aka:["OLA Madina","North OLA","Ameen Sangari","Mempeasem"],why:"Included in the 2026 drain-clearing programme."}),
  H("ankaful","Ankaful","GH","GH-CP",5.140,-1.290,{z:"cc",sev:2,exp:2,t:65,why:"Residents report flooding every year."}),
  H("ekon","Ekon and Asenadze","GH","GH-CP",5.123,-1.205,{z:"cc",sev:2,exp:1,t:65,aka:["Asenadze"],why:"Flooded on 19 and 21 June 2026."}),
  H("moree","Moree","GH","GH-CP",5.135,-1.195,{z:"cc",sev:2,exp:1,t:65,why:"A taxi was swept away here in June 2026."}),
  H("elmina","Elmina and Benya lagoon","GH","GH-CP",5.085,-1.350,{z:"cc",d:["rain","coast"],sev:1,exp:2,t:80,aka:["KEEA","Komenda"],why:"Komenda-Edina-Eguafo-Abirem was among affected areas in June 2026."}),
  H("swedru","Agona Swedru","GH","GH-CP",5.535,-0.700,{z:"cc",d:["rain","river"],sev:2,exp:2,t:90,why:"3,000 flood victims registered in 2010."}),
  H("twifopraso","Twifo Praso","GH","GH-CP",5.610,-1.550,{z:"ksi",d:["river"],sev:2,exp:1,t:120,aka:["Pra river"],why:"400 people made homeless by floods in 2017."}),
  /* Ashanti */
  H("aboabo","Aboabo","GH","GH-AH",6.700,-1.605,{z:"ksi",sev:2,exp:3,t:60,why:"Buildings on waterways; residents had to be rescued."}),
  H("sawaba","Sawaba (Asokore-Mampong)","GH","GH-AH",6.715,-1.590,{z:"ksi",sev:2,exp:3,t:60,aka:["Asokore Mampong","Asebi"],why:"Named in several Kumasi flood reports."}),
  H("anloga","Anloga and Kwadaso","GH","GH-AH",6.690,-1.640,{z:"ksi",sev:2,exp:3,t:65,aka:["Kwadaso","Tafo","Sepe Boukrom"],why:"Houses submerged after an hour of heavy rain."}),
  H("ksicentral","Kumasi Central Market","GH","GH-AH",6.695,-1.625,{z:"ksi",sev:2,exp:3,t:65,aka:["Kejetia","Alabar","Ash Town"],why:"Traders lose goods when choked gutters overflow."}),
  H("bosomtwe","Jachie and Kuntanase","GH","GH-AH",6.570,-1.580,{z:"ksi",d:["rain","river"],sev:1,exp:1,t:90,aka:["Bosomtwe"],why:"The main road to Kumasi has been blocked by floods."}),
  /* North */
  H("pwalugu","Talensi (White Volta)","GH","GH-UE",10.600,-0.850,{z:"ngh",d:["river","bagre"],sev:2,exp:1,vul:.7,t:120,aka:["Talensi","Pwalugu","Kubore"],why:"Farms along the White Volta flood when Bagre spills."}),
  H("pusiga","Pusiga and Bawku","GH","GH-UE",11.060,-0.200,{z:"ngh",d:["river","bagre"],sev:2,exp:1,vul:.7,t:120,aka:["Bawku","Zebilla","Nabdam"],why:"Named by NADMO as at risk from Bagre spillage."}),
  H("walewale","Walewale (East Mamprusi)","GH","GH-NE",10.350,-0.800,{z:"ngh",d:["river","bagre"],sev:2,exp:1,vul:.7,t:120,aka:["East Mamprusi"],why:"NADMO camps here during Bagre spillage."}),
  H("nawuni","Nawuni and Kumbungu","GH","GH-NP",9.600,-0.990,{z:"ngh",d:["river","bagre"],sev:2,exp:1,vul:.7,t:110,aka:["Kumbungu","Tolon"],why:"500 people displaced in 2020; relief to 2,500 families in June 2026."}),
  H("tamale","Tamale (Vittin, Kalaraga, Gomani)","GH","GH-NP",9.420,-0.840,{z:"ngh",sev:2,exp:3,t:70,aka:["Vittin","Kalaraga","Gomani","Sagnarigu","Fou"],why:"A five-hour downpour left many homeless."}),
  H("buipe","Central Gonja (Buipe, Chama)","GH","GH-SV",8.785,-1.465,{z:"ngh",d:["river","bagre"],sev:2,exp:1,vul:.7,t:110,aka:["Chama","Tuluwe","Central Gonja"],why:"Bridges and roads collapsed in past floods."}),
  H("daboya","Daboya and Mankarigu","GH","GH-SV",9.530,-1.380,{z:"ngh",d:["river","bagre"],sev:3,exp:1,vul:.8,t:110,aka:["North Gonja","Mankarigu"],why:"12 White Volta communities flooded after a Bagre spill; a child died."}),
  H("saboba","Saboba","GH","GH-NP",9.700,0.320,{z:"ngh",d:["river"],sev:1,exp:1,vul:.7,t:110,aka:["Kpaba bridge","Chereponi"],why:"The bridge to Yendi collapsed in past floods."}),
  H("afram","Afram Plains","GH","GH-EP",7.080,-0.130,{z:"ksi",d:["river","bagre"],sev:1,exp:1,vul:.7,t:120,aka:["Donkorkrom"],why:"NADMO lists the Afram Plains among areas hit by Bagre spillage."}),
  H("krachi","Krachi East","GH","GH-OT",7.800,-0.040,{z:"ksi",d:["river","bagre"],sev:1,exp:1,vul:.7,t:120,aka:["Kete Krachi"],why:"Northern Oti is listed for Bagre spillage."}),
  /* Volta */
  H("sogakope","Sogakope","GH","GH-TV",6.010,0.590,{z:"vol",d:["river","akosombo"],sev:3,exp:2,vul:.6,t:110,aka:["South Tongu"],why:"Flooded by the 2023 Akosombo spillage."}),
  H("adidome","Adidome","GH","GH-TV",6.075,0.500,{z:"vol",d:["river","akosombo"],sev:2,exp:1,vul:.6,t:110,aka:["Agorme","Agbave"],why:"Flooded by the 2023 Akosombo spillage."}),
  H("tefle","Tefle and Sokpoe","GH","GH-TV",5.990,0.620,{z:"vol",d:["river","akosombo"],sev:2,exp:1,vul:.6,t:110,aka:["Sokpoe"],why:"Flooded by the 2023 Akosombo spillage."}),
  H("keta","Keta","GH","GH-TV",5.915,0.990,{z:"vol",d:["rain","coast"],sev:2,exp:2,vul:.6,t:80,why:"About 3,000 people displaced in June 2023."}),
  /* Western */
  H("samreboi","Samreboi (Wassa Amenfi West)","GH","GH-WP",5.580,-2.570,{z:"wgh",d:["river"],sev:2,exp:1,vul:.6,t:120,aka:["Wassa Amenfi","Tano"],why:"River Tano floods displaced over 1,000 people in 2017."}),

  /* Lagos */
  H("lekki","Lekki Phase 1 and Agungi","NG","NG-LA",6.443,3.490,{z:"lag",d:["rain","coast"],sev:3,exp:3,t:55,aka:["Lekki","Agungi","Eti-Osa"],why:"Low reclaimed land; drains built over at Agungi."}),
  H("ajah","Ajah","NG","NG-LA",6.468,3.570,{z:"lag",d:["rain","coast"],sev:2,exp:3,t:60,aka:["Lekki-Epe Expressway"],why:"Streets flood along the Lekki-Epe corridor."}),
  H("vi","Victoria Island","NG","NG-LA",6.428,3.420,{z:"lag",d:["rain","coast"],sev:3,exp:3,t:55,aka:["VI","Akin Adesola"],why:"Low land; lagoon high tide pushes water back up the drains."}),
  H("ikoyi","Ikoyi waterfront","NG","NG-LA",6.452,3.440,{z:"lag",d:["rain","coast"],sev:2,exp:2,t:65,aka:["Banana Island","Parkview"],why:"Lagos State warns waterfront residents of high-tide backflow."}),
  H("lagosisland","Lagos Island (Isale Eko)","NG","NG-LA",6.458,3.392,{z:"lag",d:["rain","coast"],sev:2,exp:3,vul:.6,t:60,aka:["Isale Eko","Lagos Island"],why:"Densely built low-lying streets."}),
  H("ojota","Ikorodu Road (Ojota to Maryland)","NG","NG-LA",6.580,3.378,{z:"lag",sev:3,exp:3,t:55,aka:["Ojota","Maryland","Ikorodu Road"],why:"Floodwater took over the Ojota–Maryland bridge on 30 June 2026."}),
  H("oshodi","Oshodi","NG","NG-LA",6.555,3.343,{z:"lag",sev:2,exp:3,t:60,aka:["Lagos-Oshodi Expressway"],why:"The expressway floods at Oshodi bus stop."}),
  H("yaba","Yaba and Iwaya","NG","NG-LA",6.513,3.385,{z:"lag",sev:2,exp:3,vul:.6,t:60,aka:["Iwaya","Oyingbo","Lagos Mainland"],why:"Named in the June and July 2026 floods."}),
  H("gbagada","Gbagada and Oworonsoki","NG","NG-LA",6.560,3.395,{z:"lag",sev:2,exp:3,t:60,aka:["Oworonsoki"],why:"Flooded on 30 June 2026."}),
  H("ikeja","Ikeja and Agege","NG","NG-LA",6.605,3.340,{z:"lag",sev:2,exp:3,t:65,aka:["Agege","Ikeja"],why:"NEMA lists Ikeja as vulnerable to flash floods."}),
  H("alimosho","Alimosho","NG","NG-LA",6.610,3.290,{z:"lag",sev:2,exp:3,t:65,why:"NEMA lists Alimosho as vulnerable to flash floods."}),
  H("surulere","Surulere and Mushin","NG","NG-LA",6.510,3.355,{z:"lag",sev:2,exp:3,t:60,aka:["Mushin","Funsho Williams Avenue"],why:"Roads and houses submerged in July 2026."}),
  H("ojo","Ojo, Okokomaiko and Isashi","NG","NG-LA",6.470,3.180,{z:"lag",sev:2,exp:2,t:70,aka:["Okokomaiko","Isashi","Iba"],why:"Submerged after three days of rain in June 2026."}),
  H("mile12","Mile 12, Agiliti and Owode","NG","NG-LA",6.605,3.405,{z:"lag",d:["rain","river","oyan"],sev:3,exp:3,vul:.6,t:60,aka:["Agiliti","Owode","Ajegunle","Ikosi Ketu","Odo-Ogun"],why:"Ogun River floodplain; floods when Oyan Dam releases water."}),
  H("kara","Kara and Isheri","NG","NG-LA",6.660,3.375,{z:"lag",d:["river","oyan"],sev:2,exp:2,vul:.6,t:90,aka:["Isheri","Long Bridge","Lagos-Ibadan Expressway"],why:"The Ogun River overflows near the Long Bridge."}),
  H("ikorodu","Ikorodu","NG","NG-LA",6.620,3.510,{z:"lag",d:["rain","river","oyan"],sev:2,exp:3,t:65,why:"Among Lagos's highest flood-risk residential areas; affected by Oyan releases."}),
  /* Nigeria: river and dam floodplains */
  H("lokoja","Lokoja (Niger–Benue confluence)","NG","NG-KO",7.800,6.740,{z:"mid",d:["river","lagdo","niger"],sev:3,exp:2,vul:.6,t:130,aka:["Kogi","confluence"],why:"Where Niger and Benue releases meet; badly flooded in 2022."}),
  H("makurdi","Makurdi","NG","NG-BE",7.730,8.540,{z:"mid",d:["river","lagdo"],sev:2,exp:3,t:120,why:"NIHSA's Benue gauge; watch point for Lagdo releases."}),
  H("yola","Yola and Wurobokki","NG","NG-AD",9.270,12.440,{z:"nng",d:["river","lagdo"],sev:2,exp:2,vul:.6,t:120,aka:["Wurobokki","Jimeta"],why:"First Nigerian area downstream of the Lagdo Dam."}),
  H("ibi","Ibi (Benue riverbank)","NG","NG-TA",8.180,9.740,{z:"mid",d:["river","lagdo"],sev:2,exp:1,vul:.7,t:120,why:"Taraba holds the longest stretch of the Benue in Nigeria."}),
  H("ogbaru","Onitsha and Ogbaru","NG","NG-AN",6.150,6.780,{z:"sen",d:["river","lagdo","niger"],sev:2,exp:2,vul:.6,t:150,aka:["Onitsha","Ogbaru"],why:"Anambra riverbank communities downstream of both rivers."}),
  H("patani","Patani (Delta)","NG","NG-DE",5.230,6.190,{z:"sen",d:["river","lagdo","niger"],sev:2,exp:1,vul:.7,t:150,why:"Delta State is named for both river and coastal flooding."}),
  H("yenagoa","Yenagoa","NG","NG-BY",4.920,6.260,{z:"sen",d:["river","coast","lagdo","niger"],sev:2,exp:2,vul:.6,t:150,why:"Bayelsa sits at the end of the Niger and Benue river system."}),
  H("uyo","Uyo","NG","NG-AK",5.035,7.920,{z:"sen",sev:2,exp:2,t:90,why:"Torrential rain flooded streets on 9 July 2026."}),
  H("mokwa","Mokwa","NG","NG-NI",9.290,5.050,{z:"mid",d:["rain","river","niger"],sev:3,exp:2,vul:.6,t:90,why:"A pre-dawn flash flood killed at least 151 people in May 2025."}),
  H("jebba","Jebba","NG","NG-KW",9.130,4.820,{z:"mid",d:["river","niger"],sev:1,exp:1,t:130,why:"Below the Jebba Dam on the Niger."}),
  H("maiduguri","Maiduguri (Fori, Gwange, Bulabulin)","NG","NG-BO",11.840,13.150,{z:"nng",d:["rain","river","alau"],sev:3,exp:3,vul:.8,t:80,aka:["Fori","Galtimari","Gwange","Bulabulin"],why:"The Alau Dam collapse in 2024 displaced over 400,000 people."}),
  H("hadejia","Hadejia","NG","NG-JI",12.450,10.040,{z:"nng",d:["rain","river"],sev:2,exp:2,vul:.6,t:90,why:"Streets flooded in September 2022."})
];

/* Rivers and drainage systems people search by name */
FT.waters = [
  {n:"Odaw River",aka:["Odaw"],ids:["circle","adabraka","alajo","avenor","kaneshie","abosseyokai","achimota","dzorwulu","gaeast"]},
  {n:"Korle Lagoon",aka:["Korle"],ids:["oldfadama","lartebiokorshie","abosseyokai"]},
  {n:"Densu River and Weija Dam",aka:["Densu","Weija Dam"],ids:["lowerweija","tetegu","oblogo","bojo","mccarthy","glefe"]},
  {n:"Fosu Lagoon",aka:["Fosu"],ids:["abura","kotokuraba","pedu","adisadel","eyifua","stadium"]},
  {n:"Kakum River",aka:["Kakum"],ids:["ucc","kakumdo"]},
  {n:"White Volta",aka:["Bagre","Bagre Dam"],ids:["pwalugu","pusiga","walewale","nawuni","daboya","buipe","afram","krachi"]},
  {n:"Lower Volta",aka:["Volta","Akosombo","Kpong"],ids:["sogakope","adidome","tefle"]},
  {n:"Benue River",aka:["Benue","Lagdo","Lagdo Dam"],ids:["yola","ibi","makurdi","lokoja","ogbaru","patani","yenagoa"]},
  {n:"Niger River",aka:["Niger","Kainji","Jebba","Shiroro"],ids:["jebba","mokwa","lokoja","ogbaru","patani","yenagoa"]},
  {n:"Ogun River",aka:["Ogun","Oyan","Oyan Dam"],ids:["mile12","kara","ikorodu"]},
  {n:"Lagos Lagoon",aka:["Lagoon"],ids:["lekki","vi","ikoyi","lagosisland","ajah","mile12","ikorodu"]}
];

/* Past floods. date: ISO or year; year:null when the report's year is not confirmed. */
FT.events = [
  {id:"gh2606",date:"2026-06-29",year:2026,c:"GH",t:"Accra, Tema and Kasoa floods",
   ids:["circle","adabraka","alajo","kaneshie","achimota","mallam","lowerweija","tetegu","tema","kasoa","gaeast"],
   impact:"About 140 mm of rain. 39 deaths and 91,989 people affected in 7 regions; 17 deaths in Greater Accra. Government released GH₵300 million.",
   src:"https://www.myjoyonline.com/june-29-floods-killed-39-affected-nearly-92000-people-muntaka/"},
  {id:"cc2606",date:"2026-06-19",year:2026,c:"GH",t:"Cape Coast floods and mudslide",
   ids:["abura","stadium","ucc","eyifua","adisadel","nkanfoa","ekon","moree","kakumdo","elmina"],
   impact:"18 deaths in the Central Region during June 2026; 58 buildings collapsed.",
   src:"https://global-flood.emergency.copernicus.eu/news/250-floods-and-landslides-in-ghana-june-2026/"},
  {id:"np2606",date:"2026-06",year:2026,c:"GH",t:"White Volta floods, Northern Region",
   ids:["nawuni"],impact:"NADMO gave relief to over 2,500 displaced families in Tolon, Kumbungu and Sagnarigu.",
   src:"https://web.nadmo.gov.gh/news/northern-region-floods-nadmo-relief-displaced-families-2026-06-15"},
  {id:"cc2605",date:"2026-05-21",year:2026,c:"GH",t:"Cape Coast flash floods",
   ids:["kotokuraba","abura","kakumdo"],impact:"A three-and-a-half-hour downpour flooded streets, homes and shops.",
   src:"https://gna.org.gh/2026/05/heavy-thursday-downpour-inundates-cape-coast/"},
  {id:"gh2605",date:"2026-05-18",year:2026,c:"GH",t:"Accra floods",
   ids:["gaeast","adenta","kaneshie","lowerweija","adabraka","tema"],impact:"5 deaths: 3 in Ga East and 2 in Adenta.",
   src:"https://www.citinewsroom.com/?p=1186197"},
  {id:"la2606",date:"2026-06-30",year:2026,c:"NG",t:"Lagos floods",
   ids:["lekki","vi","ojota","oshodi","yaba","gbagada","ikeja","ojo","surulere"],
   impact:"Rain for over 12 hours. The Oworo transmission station was knocked out.",
   src:"https://allafrica.com/stories/202607010113.html"},
  {id:"la2607",date:"2026-07-09",year:2026,c:"NG",t:"Lagos and Uyo floods",
   ids:["lagosisland","lekki","alimosho","surulere","yaba","uyo"],impact:"Several days of rain submerged roads and houses.",
   src:"https://businessday.ng/life/article/how-persistent-torrential-rainfall-in-nigeria-wreaks-havoc-on-homes-businesses/"},
  {id:"mk2505",date:"2025-05-29",year:2025,c:"NG",t:"Mokwa flash flood",ids:["mokwa"],
   impact:"At least 151 deaths and more than 3,000 people displaced.",
   src:"https://www.news4jax.com/news/world/2025/05/31/death-toll-from-reaches-151-in-north-central-nigeria-town-submerged-in-floods-thousands-displaced/"},
  {id:"gh2025",date:"2025",year:2025,c:"GH",t:"Kaneshie and Adabraka floods; Weija spillage",
   ids:["kaneshie","adabraka","lowerweija","tetegu"],impact:"Floods returned to the same areas; Weija spillage hit communities downstream.",
   src:"https://www.myjoyonline.com/drowning-by-design-how-accra-chose-its-floods/"},
  {id:"md2409",date:"2024-09-10",year:2024,c:"NG",t:"Alau Dam collapse, Maiduguri",ids:["maiduguri"],
   impact:"NEMA counted 30+ deaths and 400,000+ people displaced.",
   src:"https://thecable.ng/30-dead-over-400000-displaced-in-maiduguri-flood-says-nema"},
  {id:"oy2410",date:"2024-10",year:2024,c:"NG",t:"Oyan Dam release, Ogun River",ids:["mile12","kara","ikorodu"],
   impact:"1,484.2 million m³ released by 12 October; riverside communities told to move to higher ground.",
   src:"https://ripplesnigeria.com/oyan-dam-lagos-urges-residents-along-ogun-river-bank-to-relocate"},
  {id:"gh2024",date:"2024",year:2024,c:"GH",t:"Kaneshie and Adabraka floods; Weija spillage",
   ids:["kaneshie","adabraka","lowerweija","tetegu"],impact:"Floods returned to the same areas; Weija spillage hit communities downstream.",
   src:"https://www.myjoyonline.com/drowning-by-design-how-accra-chose-its-floods/"},
  {id:"ak2309",date:"2023-09-15",year:2023,c:"GH",t:"Akosombo and Kpong spillage",ids:["sogakope","adidome","tefle"],
   impact:"Over 26,000 people displaced in more than 100 communities.",
   src:"https://gna.org.gh/?p=316415"},
  {id:"kt2306",date:"2023-06",year:2023,c:"GH",t:"Keta floods",ids:["keta"],impact:"About 3,000 people displaced.",
   src:"https://en.wikipedia.org/wiki/2023_Ghana_floods"},
  {id:"ng2022",date:"2022-10",year:2022,c:"NG",t:"Nigeria floods",ids:["lokoja","hadejia"],
   impact:"603 deaths and 1.3 million displaced in 33 states; heavy rain plus dam releases.",
   src:"https://www.npr.org/2022/10/17/1129399669/nigeria-floods-death-toll"},
  {id:"cc2206",date:"2022-06",year:2022,c:"GH",t:"Cape Coast floods",ids:["ankaful","adisadel","pedu","abura","eyifua"],
   impact:"Residents trapped in homes; described as an annual ritual.",
   src:"https://gna.org.gh/2022/06/oguaa-residents-want-lasting-solution-to-perennial-floods/"},
  {id:"bg2209",date:"2022-09-01",year:2022,c:"GH",t:"Bagre Dam spillage",ids:["pwalugu","pusiga"],
   impact:"NADMO told residents and farmers in six districts to move to higher ground.",
   src:"https://www.citinewsroom.com/?p=878276"},
  {id:"la2107",date:"2021-07",year:2021,c:"NG",t:"Lagos flash floods",ids:["ikoyi","vi","lekki","ajah","ikeja"],
   impact:"Homes and vehicles submerged; a building under construction collapsed.",
   src:"https://www.pressreader.com/nigeria/thisday/20210717/281582358643549"},
  {id:"wj2010",date:"2020-10-11",year:2020,c:"GH",t:"Weija Dam spillage",ids:["tetegu","oblogo","mccarthy","lowerweija","bojo"],
   impact:"Ghana Water began spilling after heavy rain in the Densu basin.",
   src:"https://www.citinewsroom.com/?p=686622"},
  {id:"nr2020",date:"2020",year:2020,c:"GH",t:"White Volta floods in the north",ids:["nawuni","daboya"],
   impact:"About 500 displaced at Nawuni; around 750 affected and a child died in North Gonja.",
   src:"https://www.peacefmonline.com/pages/local/news/202101/435945.php"},
  {id:"cc1910",date:"2019-10-30",year:2019,c:"GH",t:"Cape Coast floods",ids:["pedu","abura","eyifua","ucc"],
   impact:"About six hours of rain; residents locked in their homes.",
   src:"https://graphiconline.com/news/general-news/ghana-news-heavy-rains-flood-cape-coast.html"},
  {id:"cr1806",date:"2018-06",year:2018,c:"GH",t:"Central Region floods",ids:["kasoa","nkanfoa","kakumdo","adisadel"],
   impact:"Six of 20 districts affected; one death.",
   src:"https://citinewsroom.com/2018/06/21/c-region-nadmo-lists-safe-zones-for-residents-as-floods-kill-one/"},
  {id:"wj1707",date:"2017-07",year:2017,c:"GH",t:"Weija spillage and riverine floods",ids:["lowerweija","tetegu","oblogo","bojo","twifopraso","samreboi"],
   impact:"About 500,000 people at immediate risk below Weija; 400 homeless at Twifo Praso; 1,000+ displaced at Samreboi.",
   src:"https://m.reliefweb.int/report/2136969"},
  {id:"wj1606",date:"2016-06",year:2016,c:"GH",t:"Weija Dam spillage",ids:["tetegu","oblogo","mccarthy","lowerweija","bojo"],
   impact:"Communities below the dam inundated.",
   src:"https://www.graphic.com.gh/news/general-news/floods-inundate-weija-dam-catchment-areas.html"},
  {id:"ac1506",date:"2015-06-03",year:2015,c:"GH",t:"Accra flood and fire at Circle",ids:["circle","adabraka"],
   impact:"About 159 people died when a flooded fuel station caught fire.",
   src:"https://www.graphic.com.gh/news/general-news/downpour-causes-floods-in-parts-of-accra.html"},
  {id:"wj2014",date:"2014",year:2014,c:"GH",t:"Weija spillage",ids:["glefe"],impact:"Many homes at Glefe and Opetekwei flooded.",
   src:"https://www.graphic.com.gh/news/general-news/floods-inundate-weija-dam-catchment-areas.html"},
  {id:"sw2010",date:"2010-06-22",year:2010,c:"GH",t:"Nationwide floods",ids:["swedru"],
   impact:"35 deaths nationwide; 3,000 flood victims registered in Agona Swedru.",
   src:"https://www.graphic.com.gh/news/general-news/flood-disaster-profile-of-ghana.html"},
  {id:"ac0106",date:"2001-06-28",year:2001,c:"GH",t:"Accra floods",ids:["madina","achimota","dzorwulu","avenor","adabraka"],
   impact:"Over 300,000 people affected.",
   src:"https://www.modernghana.com/news/1035276/accra-floods-63-years-of-inertness.html"},
  {id:"ks0000",date:"",year:null,c:"GH",t:"Kumasi floods",ids:["sawaba","aboabo","anloga"],
   impact:"Three deaths reported at Asebi; houses submerged in several suburbs.",
   src:"https://starrfm.com.gh/?p=301879"},
  {id:"ks0001",date:"",year:null,c:"GH",t:"Kumasi market floods",ids:["ksicentral"],impact:"Traders' goods swept away by flooding.",
   src:"https://www.myjoyonline.com/?p=10026613"},
  {id:"ah0000",date:"",year:null,c:"GH",t:"Ashanti floods",ids:["bosomtwe","sawaba"],impact:"Roads to Kumasi blocked; a child reported missing at Sawaba.",
   src:"https://gna.org.gh/?p=165574"},
  {id:"tm0000",date:"",year:null,c:"GH",t:"Tamale and Sagnarigu floods",ids:["tamale"],impact:"A five-hour downpour left many residents homeless.",
   src:"https://ghanaiantimes.com.gh/5-hr-downpour-renders-tamale-sagnerigu-residents-homeless"},
  {id:"cg0000",date:"",year:null,c:"GH",t:"Northern Region floods",ids:["buipe","saboba"],impact:"Bridges collapsed and communities were cut off.",
   src:"https://www.graphic.com.gh/news/general-news/floods-cause-havoc-in-northern-region.html"}
];

/* Region-level reports with no named community */
FT.regionEvents = [
  {date:"2026-06",year:2026,r:"GH-TV",t:"Volta Region floods",impact:"4 deaths and 9,466 people affected in 7 districts.",src:"https://www.myjoyonline.com/june-29-floods-killed-39-affected-nearly-92000-people-muntaka/"},
  {date:"2026-06",year:2026,r:"GH-AH",t:"Ashanti Region floods",impact:"1,461 people affected in 16 districts.",src:"https://www.myjoyonline.com/june-29-floods-killed-39-affected-nearly-92000-people-muntaka/"},
  {date:"2026-06",year:2026,r:"GH-WP",t:"Western Region floods",impact:"2,031 people affected in 2 districts.",src:"https://www.myjoyonline.com/june-29-floods-killed-39-affected-nearly-92000-people-muntaka/"},
  {date:"2026-06",year:2026,r:"GH-WN",t:"Western North floods",impact:"937 people affected in 6 districts.",src:"https://www.myjoyonline.com/june-29-floods-killed-39-affected-nearly-92000-people-muntaka/"},
  {date:"2026-06",year:2026,r:"GH-EP",t:"Eastern Region floods",impact:"190 people affected in 1 district.",src:"https://www.myjoyonline.com/june-29-floods-killed-39-affected-nearly-92000-people-muntaka/"},
  {date:"2011-11-01",year:2011,r:"GH-AA",t:"Accra floods",impact:"14 deaths and 43,087 people affected.",src:"https://www.modernghana.com/news/1035276/accra-floods-63-years-of-inertness.html"},
  {date:"1995-07-04",year:1995,r:"GH-AA",t:"Accra floods",impact:"About 258 mm of rain in 5 hours; at least 17 deaths.",src:"https://www.myjoyonline.com/ghanas-resilience-preparing-for-the-rains-ahead/"}
];

/* Safe places named in past NADMO or AMA alerts (approximate locations) */
FT.safe = [
  {n:"Salvation cluster of schools, Lartebiokorshie",c:"GH",ll:[-0.240,5.546],src:"AMA and NADMO"},
  {n:"Presby Vocational School, Lartebiokorshie",c:"GH",ll:[-0.243,5.549],src:"AMA and NADMO"},
  {n:"Town Council Line park, Lartebiokorshie",c:"GH",ll:[-0.236,5.551],src:"AMA and NADMO"},
  {n:"Bishop Bowers School",c:"GH",ll:[-0.232,5.556],src:"AMA and NADMO"},
  {n:"Cape Coast Town Hall",c:"GH",ll:[-1.2455,5.1055],src:"NADMO Central"},
  {n:"Victoria Park, Cape Coast",c:"GH",ll:[-1.2465,5.1040],src:"NADMO Central"},
  {n:"Wesley Methodist Church, Cape Coast",c:"GH",ll:[-1.2430,5.1060],src:"NADMO Central"},
  {n:"Cape Coast Castle",c:"GH",ll:[-1.2417,5.1031],src:"NADMO Central"},
  {n:"Philip Quaicoe Boys and Girls Schools",c:"GH",ll:[-1.2520,5.1120],src:"NADMO Central"},
  {n:"St Augustine's College",c:"GH",ll:[-1.2680,5.1220],src:"NADMO Central"},
  {n:"Cape Coast Technical University",c:"GH",ll:[-1.2700,5.1180],src:"NADMO Central"},
  {n:"Oduponkpehe cluster of schools, Kasoa",c:"GH",ll:[-0.430,5.530],src:"NADMO Central"},
  {n:"Wasipe Senior High School, Daboya",c:"GH",ll:[-1.385,9.535],src:"Used as a shelter in 2020"}
];

/* Roads reported impassable during floods */
FT.roads = [
  {n:"Kwame Nkrumah Interchange (Circle)",c:"GH",ll:[-0.217,5.571]},
  {n:"Weija bridge at Tetegu, Accra–Kasoa road",c:"GH",ll:[-0.352,5.558]},
  {n:"Road to Cape Coast Teaching Hospital",c:"GH",ll:[-1.285,5.128]},
  {n:"N1 highway, Cape Coast–Takoradi",c:"GH",ll:[-1.300,5.110]},
  {n:"Kpaba bridge, Saboba–Yendi road",c:"GH",ll:[0.250,9.650]},
  {n:"Ikorodu Road, Ojota to Maryland bridge",c:"NG",ll:[3.378,6.578]},
  {n:"Lagos–Oshodi Expressway at Oshodi",c:"NG",ll:[3.343,6.553]},
  {n:"Lekki–Epe Expressway",c:"NG",ll:[3.520,6.445]},
  {n:"Lagos–Ibadan Expressway, Long Bridge",c:"NG",ll:[3.385,6.665]},
  {n:"Akin Adesola Street, Victoria Island",c:"NG",ll:[3.420,6.430]}
];

/* Official data feeds: none are connected in this prototype */
FT.feeds = [
  {c:"GH",n:"GMet rain stations and forecasts",what:"Official rain readings and warnings"},
  {c:"GH",n:"NADMO incidents and safe places",what:"Official warnings, evacuations and shelters"},
  {c:"GH",n:"Ghana Hydrological Authority gauges",what:"River and drain water levels"},
  {c:"GH",n:"Ghana Water Ltd (Weija Dam)",what:"Reservoir level and spill notices"},
  {c:"GH",n:"Volta River Authority (Akosombo, Kpong)",what:"Reservoir levels and releases"},
  {c:"GH",n:"Water Resources Commission (Bagre Dam)",what:"Bagre level and spill notices from Burkina Faso"},
  {c:"NG",n:"NIHSA river gauges and flood outlook",what:"Benue, Niger and Ogun water levels"},
  {c:"NG",n:"NiMet forecasts and warnings",what:"Official rain forecasts"},
  {c:"NG",n:"NEMA and LASEMA alerts",what:"Official warnings and incidents"},
  {c:"NG",n:"Ogun-Osun River Basin Authority (Oyan Dam)",what:"Release volumes"},
  {c:"NG",n:"Federal Ministry of Water Resources (Lagdo notices)",what:"Release notices from Cameroon"},
  {c:"ALL",n:"Satellite rain and flood maps (NASA IMERG, Sentinel-1)",what:"Observed rain and flooded areas"}
];

FT.emergency = {
  GH:[{n:"NADMO (free line)",num:"0800-11-3000"}],
  NG:[{n:"Emergency line",num:"112"},{n:"LASEMA, Lagos",num:"767"}]
};

/* Agencies that can publish official data once an administrator links their staff accounts.
   kind: met (weather), hydro (rivers), disaster (warnings), dam (dam operator), gov (ministry or assembly) */
FT.agencies = [
  {id:"gmet",n:"Ghana Meteorological Agency (GMet)",c:"GH",kind:"met",supplies:"Rain forecasts, weather warnings, station rainfall"},
  {id:"nadmo",n:"National Disaster Management Organisation (NADMO)",c:"GH",kind:"disaster",supplies:"Flood warnings, evacuations, safe places"},
  {id:"hydro-gh",n:"Ghana Hydrological Authority",c:"GH",kind:"hydro",supplies:"River and drain water levels"},
  {id:"gwl",n:"Ghana Water Ltd (Weija Dam)",c:"GH",kind:"dam",supplies:"Weija reservoir level and spill notices"},
  {id:"vra",n:"Volta River Authority (Akosombo, Kpong)",c:"GH",kind:"dam",supplies:"Reservoir levels and releases"},
  {id:"wrc",n:"Water Resources Commission (Bagre Dam liaison)",c:"GH",kind:"dam",supplies:"Bagre Dam levels and spill notices from SONABEL"},
  {id:"nihsa",n:"Nigeria Hydrological Services Agency (NIHSA)",c:"NG",kind:"hydro",supplies:"River gauges, Annual Flood Outlook"},
  {id:"nimet",n:"Nigerian Meteorological Agency (NiMet)",c:"NG",kind:"met",supplies:"Rain forecasts and warnings"},
  {id:"nema",n:"National Emergency Management Agency (NEMA)",c:"NG",kind:"disaster",supplies:"Flood alerts and incidents"},
  {id:"lasema",n:"Lagos State Emergency Management Agency (LASEMA)",c:"NG",kind:"disaster",supplies:"Lagos alerts and incidents"},
  {id:"oorbda",n:"Ogun-Osun River Basin Development Authority",c:"NG",kind:"dam",supplies:"Oyan Dam releases"},
  {id:"fmwr",n:"Federal Ministry of Water Resources and Sanitation",c:"NG",kind:"gov",supplies:"Lagdo Dam release notices"},
  {id:"moi-gh",n:"Ministry of the Interior (Ghana)",c:"GH",kind:"gov",supplies:"Official public safety notices, evacuation orders, coordination of NADMO and security services",web:"https://www.mint.gov.gh"},
  {id:"moi-ng",n:"Federal Ministry of Interior (Nigeria)",c:"NG",kind:"gov",supplies:"Official public safety notices, coordination of Civil Defence, Fire and other services",web:"https://interior.gov.ng"}
].map(a=>Object.assign({status:"active",publishers:[],web:"",push:["disaster","met","hydro","gov"].includes(a.kind)},a));

/* ---- core/core.js ---- */
/* ===== Open Tracker app core: data store, forecast model, search, Simple mode ===== */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const LEVELS = [
  {k:"low", n:"Low", word:"Low risk"},
  {k:"med", n:"Medium", word:"Medium risk"},
  {k:"high", n:"High", word:"High risk"},
  {k:"vhigh", n:"Very high", word:"Very high risk"}
];
const HORIZONS = [
  {k:"today", n:"Today"}, {k:"3d", n:"Next 3 days"}, {k:"season", n:"Next 3 months"}, {k:"year", n:"Next rainy season"}, {k:"past", n:"Past floods"}
];
const SHOWS = [
  {k:"risk", n:"Flood risk"}, {k:"safe", n:"Safe places"}, {k:"past", n:"Past floods"}, {k:"roads", n:"Roads to avoid"}
];

/* ---------- icons (shape + colour, so colour is never the only cue) ---------- */
const ICON = {
  low: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  med: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5L22.5 21h-21z" fill="currentColor"/><path d="M12 9v5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.5" fill="#fff"/></svg>',
  high: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5L22.5 12 12 22.5 1.5 12z" fill="currentColor"/><path d="M12 7.5v6" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="16.8" r="1.5" fill="#fff"/></svg>',
  vhigh: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.6 1.5h8.8l6.1 6.1v8.8l-6.1 6.1H7.6l-6.1-6.1V7.6z" fill="currentColor"/><path d="M9 7v6M15 7v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="9" cy="16.6" r="1.4" fill="#fff"/><circle cx="15" cy="16.6" r="1.4" fill="#fff"/></svg>',
  none: '<svg class="ic" width="SZ" height="SZ" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="3 3"/><path d="M9.5 9.3a2.6 2.6 0 115 1c-.6.9-2.5 1.4-2.5 3" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="17" r="1.3" fill="currentColor"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5L22.5 21h-21z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.4" r="1.3" fill="currentColor"/></svg>',
  info: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="7.5" r="1.4" fill="currentColor"/></svg>'
};
ICON.bell = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const icon = (k, sz = 22) => (ICON[k] || ICON.none).replaceAll("SZ", sz);
const chip = (lv, txt) => `<span class="chip lv-${lv}">${icon(lv, 16)}${esc(txt ?? (LEVELS.find(l => l.k === lv)?.n || "Not enough data"))}</span>`;

/* ---------- data store: built-in dataset, replaced by the shared database when it has been set up ---------- */
const DEFAULT_SETTINGS = {
  wE: .5, wV: .5, wH: .5, tail: .7,
  cut: {med: .12, high: .30, vhigh: .55},
  freshHours: 36,
  climate: clone(FT.climate),
  notice: "",
  approval: {on: true, agencies: {}}   /* agency changes wait for an administrator unless turned off */
};
const BUILT = {
  hotspots: FT.hotspots.map(clone),
  events: FT.events.map(clone),
  regionEvents: FT.regionEvents.map((e, i) => Object.assign({id: "re" + (i + 1)}, clone(e))),
  safe: FT.safe.map((s, i) => Object.assign({id: "safe" + (i + 1)}, clone(s))),
  roads: FT.roads.map((s, i) => Object.assign({id: "road" + (i + 1)}, clone(s))),
  dams: FT.dams.map(d => Object.assign({status: "season", lastNotice: ""}, clone(d))),
  feeds: FT.feeds.map((f, i) => Object.assign({id: "feed" + (i + 1), status: "off", note: "", last: ""}, clone(f))),
  contacts: [].concat(...Object.entries(FT.emergency).map(([c, a]) => a.map((x, i) => ({id: c.toLowerCase() + "-c" + (i + 1), c, n: x.n, num: x.num})))),
  alerts: [],
  forecasts: [],
  agencies: FT.agencies.map(clone),
  roles: [],
  members: [],
  notifications: [],
  changes: [],
  approvals: [],
  reviews: [],
  replays: []
};
/* data collections editors manage; "members" is readable by editors only (database rule) */
const COLLS = ["hotspots","events","regionEvents","safe","roads","dams","feeds","contacts","alerts","forecasts","agencies","roles","members","notifications","changes","approvals","reviews","replays"];
const DB = {api: null, user: null, cfg: null, cols: {}, canEdit: false, uid: null, downloads: null};

function data(key) {
  if (DB.cfg) return DB.cols[key] || [];
  return BUILT[key];
}
function settings() { return Object.assign(clone(DEFAULT_SETTINGS), DB.cfg ? DB.cfg : {}); }

/* indexes rebuilt on every data change */
let IX = {};
function reindex() {
  const hot = data("hotspots");
  const byId = {}; hot.forEach(h => byId[h.id] = h);
  const evByHot = {};
  data("events").forEach(e => (e.ids || []).forEach(id => (evByHot[id] = evByHot[id] || []).push(e)));
  const damById = {}; data("dams").forEach(d => damById[d.id] = d);
  IX = {hot, byId, evByHot, damById, areaById: Object.fromEntries(FT.areas.map(a => [a.id, a]))};
  OUTLOOK_CACHE.clear();
  buildSearch();
}

/* ---------- forecast model ---------- */
function rainScenarioFor(zone) {
  /* admin-entered forecast for a zone, if fresh */
  const st = settings();
  const fresh = f => { const age = (Date.now() - Date.parse(f.at)) / 36e5; return age >= -1 && age <= (st.freshHours || 36); };
  const list = officialForecasts().filter(f => f.zone === zone && f.at && fresh(f))
    .sort((a, b) => (a.model ? 1 : 0) - (b.model ? 1 : 0) || String(b.at).localeCompare(String(a.at)));   /* official first, then newest */
  return list[0] || null;
}
function pDay(M, T1, tail) {
  if (!(M > 0)) return 0;
  const mu = M / 30, f = Math.min(.7, M / 150), m = mu / f;
  return f * Math.exp(-Math.pow(T1 / m, tail));
}
const logistic = x => 1 / (1 + Math.exp(-x));

/* ctx: {month, horizon, rain:'auto'|'mm', mm, tide:'normal'|'spring', dams:{id:status}} */
function computeRisk(h, ctx) {
  if (ctx.horizon === "year") return outlookFor(h);   /* the coming rainy season has its own model */
  const st = settings();
  const m = ctx.month;
  const hz = ctx.horizon === "past" ? "3d" : ctx.horizon;
  const clim = (st.climate[h.z] || FT.climate[h.z] || {m: Array(12).fill(0)}).m;
  const drivers = h.d || [];
  const coastF = drivers.includes("coast") ? (ctx.tide === "spring" ? .7 : .85) : 1;
  const T3 = (+h.t || 70) * coastF, T1 = .75 * T3;
  const causes = [];
  let Prain = 0, rainNote = "";
  /* rain */
  if (drivers.includes("rain")) {
    let det = null;
    if (hz !== "season") {
      if (ctx.rain === "mm") det = {mm: hz === "today" ? ctx.mm / 2 : ctx.mm, src: "your scenario"};
      else {
        const f = rainScenarioFor(h.z);
        if (f) det = {mm: hz === "today" ? +f.mm24 : +f.mm72, src: f.src || "an official bulletin", at: f.at};
      }
    }
    if (det && det.mm >= 0) {
      const Tx = hz === "today" ? T1 : T3;
      Prain = logistic((det.mm - Tx) / (0.2 * Tx));
      rainNote = `Forecast rain: about ${Math.round(det.mm)} mm ${hz === "today" ? "today" : "over the next 3 days"} (from ${det.src}). Flooding here usually starts around ${Math.round(Tx)} mm.`;
    } else {
      let q = 1;
      const days = hz === "today" ? [[m, 1]] : hz === "3d" ? [[m, 3]] : [[m, 30], [(m + 1) % 12, 30], [(m + 2) % 12, 31]];
      days.forEach(([mm, n]) => { q *= Math.pow(1 - pDay(clim[mm], T1, st.tail), n); });
      Prain = 1 - q;
      const mon = MONTHS[m];
      rainNote = hz === "season"
        ? (Prain < .15 ? "Rain rarely floods this area in the coming months." : Prain < .45 ? "Heavy rain sometimes floods this area in the coming months." : "Heavy rain is likely to flood this area at least once in the coming months.")
        : (Prain < .03 ? `Typical ${mon} rain rarely floods this area.` : Prain < .12 ? `Heavy ${mon} downpours sometimes flood this area.` : `${mon} downpours often flood this area.`);
    }
    causes.push({k: "rain", t: rainNote, p: Prain});
  }
  /* dams */
  let Pdam = 0;
  drivers.filter(d => IX.damById[d]).forEach(id => {
    const dam = IX.damById[id];
    const official = damState(dam);
    const status = (ctx.dams && ctx.dams[id]) || official.status || "season";
    let p, t;
    if (status === "season") {
      const s = dam.season || Array(12).fill(0);
      p = hz === "season" ? Math.max(s[m], s[(m + 1) % 12], s[(m + 2) % 12]) : s[m];
      t = p >= .5 ? `${dam.n} often releases water at this time of year.` : p >= .2 ? `${dam.n} sometimes releases water at this time of year.` : `${dam.n} rarely releases water at this time of year.`;
    } else {
      p = FT.damStatus[status]?.p ?? .05;
      t = status === "normal" ? `${dam.n}: water level normal.` : status === "alert" ? `${dam.n} is on alert for a possible release.` : status === "release" ? `${dam.n} is releasing water.` : `${dam.n} is making a major release.`;
      if (!(ctx.dams && ctx.dams[id]) && official.notice) t += ` ${official.notice}`;
    }
    if (p > Pdam) Pdam = p;
    causes.push({k: "dam", t, p});
  });
  /* rivers without a modelled dam */
  let Priver = 0;
  if (drivers.includes("river")) {
    const M = hz === "season" ? Math.max(clim[m], clim[(m + 1) % 12], clim[(m + 2) % 12]) : clim[m];
    Priver = Math.min(.5, Math.max(0, (M - 120) / 400));
    if (Priver > .05) causes.push({k: "river", t: `Rivers here are often high in ${hz === "season" ? "the coming months" : MONTHS[m]}.`, p: Priver});
  }
  if (drivers.includes("coast")) causes.push({k: "coast", t: ctx.tide === "spring" ? "Very high tides are slowing water draining to the sea." : "High tides can slow water draining to the sea.", p: 0});
  const P = 1 - (1 - Prain) * (1 - Pdam) * (1 - Priver);
  const E = Math.min(1, (+h.exp || 2) / 3), V = Math.min(1, Math.max(0, +h.vul || .5));
  const evs = IX.evByHot[h.id] || [];
  const Hh = Math.min(1, evs.length / 4);
  if (evs.length) {
    const yrs = evs.map(e => e.year).filter(Boolean).sort((a, b) => b - a);
    causes.push({k: "history", t: `Flooded ${evs.length} time${evs.length > 1 ? "s" : ""} in our records${yrs.length ? `, most recently in ${yrs[0]}` : ""}.`, p: 0});
  }
  const score = P * (st.wE * E + st.wV * V) * (1 + st.wH * Hh);
  const c = st.cut;
  const level = score >= c.vhigh ? "vhigh" : score >= c.high ? "high" : score >= c.med ? "med" : "low";
  return {P, Prain, Pdam, Priver, E, V, H: Hh, score, level, causes, nEvents: evs.length};
}
const LVL_RANK = {low: 0, med: 1, high: 2, vhigh: 3};
function maxLevel(rs) { return rs.reduce((a, r) => LVL_RANK[r.level] > LVL_RANK[a] ? r.level : a, "low"); }

/* ---------- places ---------- */
function placeHot(p) {
  if (!p) return [];
  if (p.type === "hotspot") return IX.byId[p.id] ? [IX.byId[p.id]] : [];
  if (p.type === "area") return IX.hot.filter(h => h.r === p.id);
  if (p.type === "country") return IX.hot.filter(h => h.c === p.id);
  if (p.type === "water") { const w = FT.waters[p.idx]; return (w?.ids || []).map(id => IX.byId[id]).filter(Boolean); }
  return [];   /* towns and countries outside Ghana and Nigeria have no recorded hotspots yet */
}
function placeName(p) {
  if (!p) return "";
  if (p.type === "hotspot") return IX.byId[p.id]?.n || "Unknown area";
  if (p.type === "area") { const a = IX.areaById[p.id]; return a ? `${a.n} ${a.c === "GH" ? "Region" : a.id === "NG-FC" ? "" : "State"}`.trim() : ""; }
  if (p.type === "country") return FT.countries[p.id].n;
  if (p.type === "water") return FT.waters[p.idx]?.n || "";
  if (p.type === "wc") return countryName(p.id);
  if (p.type === "wp") return worldPlace(p.id)?.n || "";
  return "";
}
function placeCountry(p) {
  if (!p) return null;
  if (p.type === "country") return p.id;
  if (p.type === "area") return IX.areaById[p.id]?.c;
  if (p.type === "hotspot") return IX.byId[p.id]?.c;
  if (p.type === "water") return placeHot(p)[0]?.c;
  if (p.type === "wc") return p.id;
  if (p.type === "wp") return worldPlace(p.id)?.c || null;
  return null;
}
function crumbsFor(p) {
  const out = [];
  if (!p) return out;
  const c = placeCountry(p);
  if (c && p.type !== "wc") out.push({p: countryPlace(c), n: countryName(c)});
  if (p.type === "hotspot") { const h = IX.byId[p.id]; if (h) out.push({p: {type: "area", id: h.r}, n: placeName({type: "area", id: h.r})}); }
  if (p.type !== "country") out.push({p, n: placeName(p)});
  return out;
}
function placeCenter(p) {
  if (p.type === "wc") { const c = worldCountry(p.id); return c ? {bounds: [[c.b[0], c.b[1]], [c.b[2], c.b[3]]], ll: c.ll, z: 5, maxZoom: 7} : {ll: [0, 15], z: 1.6}; }
  if (p.type === "wp") { const w = worldPlace(p.id); return w ? {ll: w.ll, z: 11} : {ll: [0, 15], z: 1.6}; }
  const hs = placeHot(p);
  if (p.type === "hotspot" && hs[0]) return {ll: hs[0].ll, z: 12.5};
  if (p.type === "country") return {ll: FT.countries[p.id].ll, z: FT.countries[p.id].z};
  if (p.type === "area") {
    const a = IX.areaById[p.id];
    if (hs.length) return fitOf(hs.map(h => h.ll), 7);
    return {ll: a.ll, z: 7.5};
  }
  return fitOf(hs.map(h => h.ll), 7);
}
function fitOf(pts, fallbackZ) {
  if (!pts.length) return {ll: [3, 8], z: 4.6};
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return {bounds: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], ll: [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2], z: fallbackZ};
}
function km(a, b) {
  const R = 6371, t = Math.PI / 180, dLat = (b[1] - a[1]) * t, dLon = (b[0] - a[0]) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function eventsFor(p) {
  const ids = new Set(placeHot(p).map(h => h.id));
  const evs = data("events").filter(e => (e.ids || []).some(id => ids.has(id)));
  let regs = [];
  if (p.type === "area") regs = data("regionEvents").filter(e => e.r === p.id);
  if (p.type === "country") regs = data("regionEvents").filter(e => (e.r || "").startsWith(p.id));
  return evs.concat(regs.map(r => Object.assign({regionOnly: true}, r))).sort((a, b) => (b.year || 0) - (a.year || 0) || String(b.date).localeCompare(String(a.date)));
}

/* ---------- search ---------- */
let SEARCH = [], WORLD_SEARCH = null;
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function buildSearch() {
  SEARCH = [];
  Object.entries(FT.countries).forEach(([id, c]) => SEARCH.push({p: {type: "country", id}, t: c.n, s: "Country", keys: [c.n, id === "GH" ? "gh" : "ng"]}));
  FT.areas.forEach(a => SEARCH.push({p: {type: "area", id: a.id}, t: placeName({type: "area", id: a.id}), s: `${a.c === "GH" ? "Region" : "State"}, ${FT.countries[a.c].n}`, keys: [a.n, a.id === "NG-FC" ? "Abuja" : ""]}));
  IX.hot.forEach(h => SEARCH.push({p: {type: "hotspot", id: h.id}, t: h.n, s: `${placeName({type: "area", id: h.r})}, ${FT.countries[h.c]?.n || ""}`, keys: [h.n, ...(h.aka || [])]}));
  FT.waters.forEach((w, i) => SEARCH.push({p: {type: "water", idx: i}, t: w.n, s: "River, lagoon or dam", keys: [w.n, ...w.aka]}));
  SEARCH.forEach(x => x.nk = x.keys.filter(Boolean).map(norm));
  if (!WORLD_SEARCH) { WORLD_SEARCH = worldSearchEntries(); WORLD_SEARCH.forEach(x => x.nk = x.keys.filter(Boolean).map(norm)); }   /* built once */
  SEARCH.push(...WORLD_SEARCH);
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function search(q) {
  const n = norm(q);
  if (n.length < 2) return [];
  const out = [];
  SEARCH.forEach(x => {
    let best = 0;
    x.nk.forEach(k => {
      if (k === n) best = Math.max(best, 100);
      else if (k.startsWith(n)) best = Math.max(best, 80);
      else if (k.split(" ").some(w => w.startsWith(n))) best = Math.max(best, 70);
      else if (k.includes(n)) best = Math.max(best, 50);
      else if (n.length >= 4) {
        const tol = n.length >= 7 ? 2 : 1;
        if (k.split(" ").some(w => lev(w, n) <= tol) || lev(k, n) <= tol) best = Math.max(best, 40);
      }
    });
    if (best) out.push([best + (x.p.type === "country" || x.p.type === "wc" ? 5 : x.p.type === "area" ? 3 : 0), x]);
  });
  return out.sort((a, b) => b[0] - a[0]).slice(0, 8).map(a => a[1]);
}

/* ---------- UI state ---------- */
const NOW = new Date();
const UI = {
  mode: "simple", screen: "where", pickCountry: null, place: null, when: "3d", show: "risk", year: "all",
  q: "", open: {}, three: false,
  ex: {month: NOW.getMonth(), rain: "auto", mm: 100, tide: "normal", dams: {}, country: "ALL", area: "", types: {rain: true, river: true, dam: true, coast: true}, minLevel: "low", horizon: "3d", year: "all"},
  admin: {tab: "overview", edit: null, q: "", confirm: null, auditF: {coll: "", by: "", q: ""}, people: {q: "", hits: [], role: "data-editor", agency: ""}},
  ag: {type: "warning"},
  contrib: {type: null, sent: false, noPlace: false},
  replay: {id: null, i: 0}
};
try { const ts = localStorage.getItem("ft-ts"); if (ts) document.documentElement.classList.add("ts-" + ts); } catch (e) {}

function simpleCtx(horizon) {
  return {month: NOW.getMonth(), horizon: horizon || UI.when, rain: "auto", tide: "normal", dams: {}};
}
function riskOf(h, ctx) { return computeRisk(h, ctx || simpleCtx()); }

/* ---------- rendering helpers ---------- */
function toast(msg) {
  document.querySelectorAll(".toast").forEach(x => x.remove());   /* one message at a time */
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function activeAlerts(country, areaId) {
  const now = Date.now();
  return officialAlerts().filter(a => (!a.expires || Date.parse(a.expires) > now) && (!country || a.c === country || a.c === "ALL") && (!areaId || !a.areas || !a.areas.length || a.areas.includes(areaId)));
}
function alertBanners(p) {
  const c = placeCountry(p);
  const areaId = p?.type === "area" ? p.id : p?.type === "hotspot" ? IX.byId[p.id]?.r : null;
  return activeAlerts(c, areaId).map(a => `<div class="notice ${a.level === "warning" ? "alert" : a.level === "watch" ? "" : "info"}" role="alert">${a.level === "info" ? ICON.info : ICON.warn}<div><b>${esc(a.level === "warning" ? "Official flood warning" : a.level === "watch" ? "Official flood watch" : "Official notice")} · ${esc(a.agency || "")}</b>${esc(a.msg)}<div class="small muted">${a.issued ? "Issued " + esc(fmtDate(a.issued)) : ""}${a.expires ? " · until " + esc(fmtDate(a.expires)) : ""}</div></div></div>`).join("");
}
/* only http(s) links are ever rendered */
function safeUrl(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(String(u || "")) ? String(u) : ""; }
function fmtDate(s) {
  const d = new Date(s); if (isNaN(d)) return s;
  return d.toLocaleString("en-GB", {day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"});
}
function evDate(e) {
  if (!e.year) return "Year not confirmed";
  if (/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return new Date(e.date + "T12:00:00").toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric"});
  if (/^\d{4}-\d{2}$/.test(e.date)) return MONTHS[+e.date.slice(5) - 1] + " " + e.year;
  return String(e.year);
}
function srcHost(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "source"; } }
function dataNote() {
  const anyFc = Object.keys(settings().climate).some(z => rainScenarioFor(z));
  const live = data("feeds").some(f => f.status === "on") || Object.keys(publisherMap()).length > 0;
  const head = live ? "Some official data is connected" : "Official live data is not connected yet";
  const body = anyFc
    ? "Official rain forecasts are used where they are available. Elsewhere Open Tracker uses typical weather for " + MONTHS[NOW.getMonth()] + ", river and dam patterns, and past floods."
    : "Open Tracker estimates risk from typical weather for " + MONTHS[NOW.getMonth()] + ", river and dam patterns, and past floods. When official rain, river and dam readings are connected, they will show here first.";
  return `<div class="notice">${ICON.info}<div><b>${head}</b>${body} <button class="linkbtn" data-act="go-status">See data status</button></div></div>`;
}


/* ---- core/auth.js ---- */
/* ===== Access control: roles, permissions and who holds them =====
   Two layers protect Open Tracker's data:
   1. Database rules (declared at publish) decide who can write at all: only Editors and the Owner write shared
      data; an agency account can only ever write inside its own agencyData/<its id> area.
   2. Open Tracker roles (below) narrow what each Editor can do in the interface, and decide whose agency posts
      the public sees. Roles are stored in "roles", people in "members" (readable by Editors only). */
const PERMS = [
  ["data.edit", "Add and edit flood data (areas, past floods, safe places, roads, feeds, numbers)"],
  ["data.delete", "Delete flood data"],
  ["warnings.manage", "Post, change and remove official warnings"],
  ["forecasts.manage", "Enter rain forecasts and set dam status"],
  ["notify.send", "Send public notifications (phone alerts)"],
  ["model.manage", "Change the forecast model and public notice"],
  ["agencies.manage", "Add agencies, link their staff and approve access requests"],
  ["approvals.manage", "Approve or reject agency posts and changes"],
  ["contributions.review", "Review contributions and suggestions from the public"],
  ["users.manage", "Add people, assign roles and create roles"],
  ["audit.view", "See and export the audit log"],
  ["analytics.view", "See visitor analytics"],
  ["backup.manage", "Back up, restore and reset all data"],
  ["agency.publish", "Publish live data for their own agency"]
];
const PERM_KEYS = PERMS.map(p => p[0]);
const BUILTIN_ROLES = [
  {id: "administrator", n: "Administrator", builtin: true, perms: PERM_KEYS.filter(p => p !== "agency.publish")},
  {id: "data-editor", n: "Data editor", builtin: true, perms: ["data.edit", "data.delete", "warnings.manage", "forecasts.manage", "contributions.review"]},
  {id: "forecaster", n: "Duty forecaster", builtin: true, perms: ["warnings.manage", "forecasts.manage"]},
  {id: "auditor", n: "Auditor (read-only)", builtin: true, perms: ["audit.view"]},
  {id: "agency-editor", n: "Agency editor", builtin: true, perms: ["data.edit", "data.delete", "warnings.manage", "forecasts.manage", "notify.send", "agency.publish"]},
  {id: "agency-publisher", n: "Agency publisher", builtin: true, perms: ["agency.publish"]}
];

const AUTH = {
  isOwner: false,
  /* role object for the current viewer, or null */
  role() {
    if (!DB.uid) return null;
    const m = (DB.cols.members || []).find(x => x.id === DB.uid);
    if (!m || m.active === false) return null;
    return roles().find(r => r.id === m.role) || null;
  },
  /* agency this viewer publishes for (from the public agency registry) */
  agency() {
    if (!DB.uid) return null;
    return agencies().find(a => a.status !== "suspended" && (a.publishers || []).includes(DB.uid)) || null;
  },
  can(perm) {
    if (!DB.api) return false;
    if (perm === "agency.publish") return !!AUTH.agency();
    if (AUTH.isOwner) return true;
    if (!DB.canEdit) return false;          /* platform write access is required for every shared-data permission */
    const r = AUTH.role();
    return !!(r && (r.perms || []).includes(perm));
  },
  anyAdmin() { return PERM_KEYS.filter(p => p !== "agency.publish").some(p => AUTH.can(p)); },
  label() {
    if (AUTH.isOwner) return "Owner";
    const r = AUTH.role(), a = AUTH.agency(); if (r) return r.n + (a && r.id !== "agency-publisher" ? " · " + a.n : "");
    if (a) return "Publisher for " + a.n;
    return "";
  }
};
function roles() {
  const saved = data("roles");
  const byId = Object.fromEntries(saved.map(r => [r.id, r]));
  /* built-in roles always exist; their permissions can't be removed by mistake */
  return BUILTIN_ROLES.map(r => Object.assign({}, r, byId[r.id] ? {n: byId[r.id].n || r.n} : {})).concat(saved.filter(r => !BUILTIN_ROLES.some(b => b.id === r.id)));
}
function agencies() { return data("agencies"); }
/* which collection needs which permission */
const COLL_PERM = {
  alerts: "warnings.manage", forecasts: "forecasts.manage", dams: "forecasts.manage",
  hotspots: "data.edit", events: "data.edit", regionEvents: "data.edit", safe: "data.edit", roads: "data.edit",
  feeds: "data.edit", contacts: "data.edit", agencies: "agencies.manage", roles: "users.manage", members: "users.manage",
  notifications: "notify.send", changes: "approvals.manage", approvals: "approvals.manage", reviews: "contributions.review", replays: "data.edit"
};
function canWrite(coll) { return AUTH.can(COLL_PERM[coll] || "users.manage"); }
function canDelete(coll) {
  const p = COLL_PERM[coll];
  if (["warnings.manage", "forecasts.manage", "agencies.manage", "users.manage", "notify.send"].includes(p)) return AUTH.can(p);
  return AUTH.can("data.delete");
}

/* ---- features/agency.js ---- */
/* ===== Agency publishing: linked agency staff post warnings, forecasts, dam status and readings =====
   Each agency account writes only under agencyData/<its own id>/posts (enforced by database rules).
   The public sees a post only if its author is listed as a publisher of an active agency. */
const AG = {posts: {}, subs: {}, own: null, ownPosts: [], requests: [], reqSub: null, ownSub: null};
const POST_TYPES = [["warning", "Flood warning"], ["forecast", "Rain forecast"], ["dam", "Dam status"], ["reading", "Gauge or station reading"]];
const READING_KINDS = [["river", "River level (m)"], ["rain", "Rainfall (mm)"], ["reservoir", "Reservoir level (m)"], ["release", "Dam release (m³/s)"]];

function publisherMap() {
  const map = {};
  agencies().filter(a => a.status !== "suspended").forEach(a => (a.publishers || []).forEach(uid => map[uid] = a));
  return map;
}
/* keep one live subscription per approved publisher */
function syncAgencySubs() {
  if (!DB.api) return;
  const want = new Set(Object.keys(publisherMap()));
  Object.keys(AG.subs).forEach(uid => { if (!want.has(uid)) { AG.subs[uid](); delete AG.subs[uid]; delete AG.posts[uid]; } });
  want.forEach(uid => {
    if (AG.subs[uid]) return;
    try {
      AG.subs[uid] = DB.api.collection(`agencyData/${uid}/posts`).orderBy("at", "desc").limit(60)
        .onSnapshot(s => { AG.posts[uid] = s.docs.map(d => Object.assign({}, d.data(), {id: d.id, uid})); afterData(); }, () => {});
    } catch (e) { /* malformed id: ignore that publisher */ }
  });
  if (AUTH.can("agencies.manage") && !AG.reqSub) {
    AG.reqSub = DB.api.collection("agencyData").onSnapshot(s => { AG.requests = s.docs.map(d => Object.assign({}, d.data(), {id: d.id})).filter(d => d.request); afterData(); }, () => {});
  }
  if (DB.uid && !AG.ownSub) {
    try {
      AG.ownSub = DB.api.doc(`agencyData/${DB.uid}`).onSnapshot(s => { AG.own = s.exists ? s.data() : null; afterData(); }, () => {});
      DB.api.collection(`agencyData/${DB.uid}/posts`).orderBy("at", "desc").limit(40)
        .onSnapshot(s => { AG.ownPosts = s.docs.map(d => Object.assign({}, d.data(), {id: d.id})); afterData(); }, () => {});
    } catch (e) {}
  }
}
/* agency accounts write free-form documents, so every field is checked and coerced here */
const str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
const fin = (v, lo, hi) => { const x = Number(v); return Number.isFinite(x) && x >= lo && x <= hi ? x : null; };
function cleanPost(p, agency) {
  const at = str(p.at, 40); if (isNaN(new Date(at))) return null;
  const base = {id: str(p.id, 200), uid: p.uid, type: p.type, at, agency};
  if (p.type === "warning") {
    const msg = str(p.msg, 1000).trim(); if (!msg) return null;
    const areas = Array.isArray(p.areas) ? p.areas.filter(id => IX.areaById[id] && IX.areaById[id].c === agency.c).slice(0, 60) : [];
    return Object.assign(base, {level: ["warning", "watch", "info"].includes(p.level) ? p.level : "warning", c: agency.c, areas, msg, expires: isNaN(new Date(p.expires)) ? "" : str(p.expires, 40),
      push: p.push === true && agency.push !== false});
  }
  if (p.type === "forecast") {
    const mm24 = fin(p.mm24, 0, 2000), mm72 = fin(p.mm72, 0, 3000);
    if (mm24 === null || mm72 === null || !settings().climate[p.zone]) return null;
    return Object.assign(base, {zone: p.zone, mm24, mm72});
  }
  if (p.type === "dam") {
    if (!IX.damById[p.dam] || !FT.damStatus[p.status] || p.status === "season") return null;
    return Object.assign(base, {dam: p.dam, status: p.status, notice: str(p.notice, 200)});
  }
  if (p.type === "reading") {
    const ll = Array.isArray(p.ll) ? [fin(p.ll[0], -180, 180), fin(p.ll[1], -90, 90)] : [null, null];
    const value = fin(p.value, -1e6, 1e7), station = str(p.station, 120).trim();
    if (ll.includes(null) || value === null || !station || !READING_KINDS.some(k => k[0] === p.kind)) return null;
    return Object.assign(base, {station, kind: p.kind, value, ll});
  }
  return null;
}
function approvedPosts(type) {
  const pm = publisherMap();
  const out = [];
  Object.entries(AG.posts).forEach(([uid, list]) => {
    const a = pm[uid]; if (!a) return;
    list.forEach(p => { if (!p.retracted && p.type === type && APPROVAL.postStatus(p, uid, a) === "live") { const c = cleanPost(p, a); if (c) out.push(c); } });
  });
  return out.sort((x, y) => String(y.at).localeCompare(String(x.at)));
}

/* ---------- what the rest of the app reads ---------- */
function officialAlerts() {
  return data("alerts").concat(approvedPosts("warning").map(p => ({
    id: "ag-" + p.uid + "-" + p.id, level: p.level || "warning", c: p.c || p.agency.c, areas: p.areas || [],
    agency: p.agency.n, msg: p.msg, issued: p.at, expires: p.expires})));
}
function officialForecasts() {
  return data("forecasts").concat(approvedPosts("forecast").map(p => ({zone: p.zone, mm24: p.mm24, mm72: p.mm72, src: p.agency.n, at: p.at})))
    .concat((window.WEBAPP?.forecasts() || []).map(f => Object.assign({}, f, {model: true})));   /* weather-model forecasts rank below official ones */
}
/* latest official dam state: an agency post wins if it is newer than the editor's setting */
function damState(dam) {
  const post = approvedPosts("dam").find(p => p.dam === dam.id);
  if (post && (!dam.updated || String(post.at) > String(dam.updated))) return {status: post.status, notice: post.notice ? `${post.notice} (${post.agency.n})` : `Reported by ${post.agency.n}.`};
  return {status: dam.status || "season", notice: dam.lastNotice || ""};
}
function officialReadings() { return approvedPosts("reading"); }

/* ---------- agency portal ---------- */
function viewAgency() {
  if (!DB.api || !DB.uid) return `<h1>Agency portal</h1><div class="notice">${ICON.info}<div><b>Sign in to publish</b>Agency staff publish live data here after an administrator links their account.</div></div>`;
  const a = AUTH.agency();
  if (!a) return agencyRequestView();
  const t = UI.ag.type;
  const f = (inner) => `<form class="card" id="ag-form" data-type="${t}"><h2>Publish ${esc(POST_TYPES.find(x => x[0] === t)[1].toLowerCase())}</h2><div class="formgrid">${inner}</div><p class="small muted" id="ag-err" role="alert"></p><div class="toolbar"><button class="sbtn primary" type="submit">Publish now</button></div></form>`;
  const sel = (id, label, opts, v) => `<label class="field"><span>${label}</span><select id="${id}">${opts.map(([k, n]) => `<option value="${esc(k)}" ${String(v) === String(k) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  const areasOpts = FT.areas.filter(x => x.c === a.c);
  let form = "";
  if (t === "warning") form = f(`${sel("ag-level", "Type", [["warning", "Flood warning (red)"], ["watch", "Flood watch (amber)"], ["info", "Notice (blue)"]], "warning")}
      <label class="field wide"><span>Regions or states (hold Ctrl or Cmd to choose several; none = whole country)</span><select id="ag-areas" multiple size="6">${areasOpts.map(x => `<option value="${x.id}">${esc(x.n)}</option>`).join("")}</select></label>
      <label class="field wide"><span>Message in plain words</span><textarea id="ag-msg" required></textarea></label>
      <label class="field"><span>Valid until</span><input id="ag-exp" type="datetime-local" value="${localDT(Date.now() + 864e5)}"></label>
      ${a.push !== false ? `<div class="checks wide"><label><input type="checkbox" id="ag-push" checked> Also send to people's phones as a public notification</label></div>` : ""}`);
  if (t === "forecast") form = f(`${sel("ag-zone", "Weather zone", Object.entries(settings().climate).map(([k, v]) => [k, v.n]), "acc")}
      <label class="field"><span>Rain next 24 hours (mm)</span><input id="ag-mm24" type="number" min="0" step="any" required></label>
      <label class="field"><span>Rain next 3 days (mm)</span><input id="ag-mm72" type="number" min="0" step="any" required></label>`);
  if (t === "dam") form = f(`${sel("ag-dam", "Dam", data("dams").map(d => [d.id, d.n]), data("dams")[0]?.id)}
      ${sel("ag-status", "Status", Object.entries(FT.damStatus).filter(([k]) => k !== "season").map(([k, v]) => [k, v.n]), "normal")}
      <label class="field wide"><span>Notice for the public</span><input id="ag-notice" placeholder="For example: release of 200 m³/s from 10:00"></label>`);
  if (t === "reading") form = f(`<label class="field"><span>Station name</span><input id="ag-station" required></label>
      ${sel("ag-kind", "Measurement", READING_KINDS, "river")}
      <label class="field"><span>Value</span><input id="ag-value" type="number" step="any" required></label>
      <label class="field"><span>Latitude</span><input id="ag-lat" type="number" step="any" required></label>
      <label class="field"><span>Longitude</span><input id="ag-lon" type="number" step="any" required></label>`);
  return `
    <h1>Agency portal</h1>
    <div class="notice info">${ICON.info}<div><b>Publishing for ${esc(a.n)}</b>${APPROVAL.needed(a.id) ? "An administrator checks each post. It appears on Open Tracker, labelled with your agency's name, as soon as it is approved." : "Posts appear on Open Tracker within seconds, labelled with your agency's name, and feed straight into the risk model."}</div></div>
    <nav class="tabs" aria-label="What to publish">${POST_TYPES.map(([k, n]) => `<button data-act="ag-type" data-k="${k}" aria-pressed="${t === k}">${n}</button>`).join("")}</nav>
    ${form}
    <div class="card"><h2>Your recent posts</h2>
      <div class="tablewrap"><table><thead><tr><th>When</th><th>Type</th><th>Details</th><th>Status</th><th></th></tr></thead><tbody>
      ${AG.ownPosts.map(p => `<tr><td class="num">${esc(fmtDate(p.at))}</td><td>${esc((POST_TYPES.find(x => x[0] === p.type) || [0, p.type])[1])}</td><td>${esc(postSummary(p))}</td><td>${p.retracted ? "Withdrawn" : {live: "Live", pending: "Waiting for approval", rejected: "Not approved"}[APPROVAL.postStatus(p, DB.uid, a)]}</td><td>${p.retracted ? "" : `<button class="sbtn danger" data-act="ag-retract" data-id="${esc(p.id)}">Withdraw</button>`}</td></tr>`).join("") || `<tr><td colspan="5">Nothing published yet.</td></tr>`}
      </tbody></table></div></div>`;
}
function postSummary(p) {
  if (p.type === "warning") return p.msg || "";
  if (p.type === "forecast") return `${settings().climate[p.zone]?.n || p.zone}: ${p.mm24} mm / 24 h, ${p.mm72} mm / 3 days`;
  if (p.type === "dam") return `${IX.damById[p.dam]?.n || p.dam}: ${FT.damStatus[p.status]?.n || p.status}${p.notice ? " · " + p.notice : ""}`;
  if (p.type === "reading") return `${p.station}: ${p.value} ${(READING_KINDS.find(k => k[0] === p.kind) || [0, ""])[1].replace(/^.*\(|\)$/g, "")}`;
  return "";
}
function localDT(ms) { const d = new Date(ms); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }

function agencyRequestView() {
  const req = AG.own?.request, dec = !req && AG.own?.decision;
  return `
    <h1>Agency portal</h1>
    <p>Staff of NADMO, GMet, NIHSA, NiMet, NEMA, LASEMA, dam operators and other agencies can publish warnings, forecasts and readings here once an administrator approves them.</p>
    ${dec && !dec.approved ? `<div class="notice">${ICON.info}<div><b>Your last request was not approved</b>Contact an Open Tracker administrator, or send a new request below.</div></div>` : ""}
    ${dec && dec.approved ? `<div class="notice">${ICON.info}<div><b>Request approved</b>Your publishing access is being set up. If this message stays, ask an administrator to check your agency link.</div></div>` : ""}
    ${req ? `<div class="notice info">${ICON.info}<div><b>Request sent</b>You asked to publish for ${esc(agencies().find(x => x.id === req.agency)?.n || req.agency)} on ${esc(fmtDate(req.at))}. An administrator will review it.</div></div>` : ""}
    <form class="card" id="ag-request"><h2>${req ? "Change your request" : "Request publishing access"}</h2>
      <label class="field"><span>Your agency</span><select id="ag-req-agency">${agencies().filter(a => a.status !== "suspended").map(a => `<option value="${esc(a.id)}" ${req?.agency === a.id ? "selected" : ""}>${esc(a.n)}</option>`).join("")}</select></label>
      <label class="field"><span>Your job title and office (shown to administrators only)</span><input id="ag-req-note" maxlength="200" value="${esc(req?.note || "")}"></label>
      <p class="small muted" id="ag-err" role="alert"></p>
      <div class="toolbar"><button class="sbtn primary" type="submit">Send request</button></div>
    </form>
    <p class="small muted">If your agency isn't listed, ask an Open Tracker administrator to add it.</p>`;
}

async function agencySubmit(form) {
  const err = form.querySelector("#ag-err");
  const v = id => form.querySelector(id)?.value ?? "";
  try {
    if (form.id === "ag-request") {
      await DB.api.doc(`agencyData/${DB.uid}`).set({request: {agency: v("#ag-req-agency"), note: v("#ag-req-note").trim().slice(0, 200), at: new Date().toISOString()}});
      toast("Request sent.");
      return;
    }
    const a = AUTH.agency(); if (!a) throw new Error("Your account isn't linked to an agency.");
    const t = form.dataset.type;
    const post = {type: t, at: new Date().toISOString(), c: a.c, retracted: false};
    const need = (x, msg) => { if (x === "" || x == null || (typeof x === "number" && isNaN(x))) throw new Error(msg); return x; };
    if (t === "warning") Object.assign(post, {level: v("#ag-level"), areas: [...form.querySelector("#ag-areas").selectedOptions].map(o => o.value), msg: need(v("#ag-msg").trim(), "Write the warning message."), expires: v("#ag-exp") ? new Date(v("#ag-exp")).toISOString() : "", push: !!form.querySelector("#ag-push")?.checked});
    if (t === "forecast") Object.assign(post, {zone: v("#ag-zone"), mm24: need(parseFloat(v("#ag-mm24")), "Enter the 24-hour rain."), mm72: need(parseFloat(v("#ag-mm72")), "Enter the 3-day rain.")});
    if (t === "dam") Object.assign(post, {dam: v("#ag-dam"), status: v("#ag-status"), notice: v("#ag-notice").trim().slice(0, 200)});
    if (t === "reading") {
      const lat = parseFloat(v("#ag-lat")), lon = parseFloat(v("#ag-lon"));
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Enter a valid latitude and longitude.");
      Object.assign(post, {station: need(v("#ag-station").trim(), "Enter the station name."), kind: v("#ag-kind"), value: need(parseFloat(v("#ag-value")), "Enter the value."), ll: [lon, lat]});
    }
    if (post.mm24 < 0 || post.mm72 < 0) throw new Error("Rain can't be negative.");
    await DB.api.collection(`agencyData/${DB.uid}/posts`).doc().set(post);
    toast(APPROVAL.needed(a.id) ? "Sent. It goes live once an administrator approves it." : "Published.");
    form.reset();
  } catch (e) {
    if (err) err.textContent = e?.code === "invalid_argument" ? "Your access level can't publish yet. Ask the Open Tracker owner to invite you as a Contributor or Editor." : e?.message && !e.code ? e.message : "That didn't publish. Check your connection and try again.";
  }
}
async function agencyAct(act, el) {
  try {
    if (act === "ag-type") { UI.ag.type = el.dataset.k; return render(); }
    if (act === "ag-retract") { if (!/^[A-Za-z0-9_-]{1,200}$/.test(el.dataset.id)) return; await DB.api.doc(`agencyData/${DB.uid}/posts/${el.dataset.id}`).update({retracted: true, retractedAt: new Date().toISOString()}); toast("Withdrawn."); }
  } catch (e) { toast("That didn't save. Try again."); }
}

/* ---- features/notify.js ---- */
/* ===== Public notifications and "My alerts" =====
   Sources, newest first: notices sent from Admin ("notifications"), agency warnings marked for broadcast,
   and — on the self-hosted web app — notices from its push server (window.WEBAPP).
   Saved places live in this browser only (localStorage); they decide which notices are "for you".
   Real device push needs the self-hosted web app; inside claude.ai alerts appear while the page is open. */
const NOTICE_LEVELS = [["warning", "Flood warning"], ["watch", "Flood watch"], ["info", "Information"], ["clear", "All clear"]];
const MY = {places: [], seen: 0, shown: new Set(), since: Date.now() - 30e3};
const MY_MAX = 12;
(function loadMy() {
  try {
    const p = JSON.parse(localStorage.getItem("ft-places") || "[]");
    MY.places = Array.isArray(p) ? p.filter(k => typeof k === "string" && /^(area|hotspot|country|wc|wp):[A-Za-z0-9_-]{1,60}$/.test(k)).slice(0, MY_MAX) : [];
    MY.seen = +localStorage.getItem("ft-seen") || 0;
  } catch (e) { /* storage blocked: alerts still work for this visit */ }
})();
function saveMy() { try { localStorage.setItem("ft-places", JSON.stringify(MY.places)); localStorage.setItem("ft-seen", String(MY.seen)); } catch (e) {} }

const placeKey = p => p && p.type !== "water" ? p.type + ":" + p.id : "";
function keyPlace(k) {
  const i = k.indexOf(":"), type = k.slice(0, i), id = k.slice(i + 1);
  const ok = type === "hotspot" ? IX.byId[id] : type === "area" ? IX.areaById[id] : type === "country" ? FT.countries[id]
    : type === "wc" ? worldCountry(id) : type === "wp" ? worldPlace(id) : null;
  return ok ? {type, id} : null;
}
function myPlaces() { return MY.places.map(keyPlace).filter(Boolean); }
function isMine(p) { return MY.places.includes(placeKey(p)); }
function toggleMine(p) {
  const k = placeKey(p); if (!k) return;
  if (isMine(p)) MY.places = MY.places.filter(x => x !== k);
  else { if (MY.places.length >= MY_MAX) { toast(`You can follow up to ${MY_MAX} places. Remove one first.`); return; } MY.places.push(k); }
  saveMy();
  toast(isMine(p) ? `You'll get alerts for ${placeName(p)}.` : `Alerts for ${placeName(p)} turned off.`);
  window.WEBAPP?.sync();
}

/* ---------- reading notices ---------- */
function normNotice(n, src) {
  const at = String(n.at || n.issued || ""), t = Date.parse(at);
  if (!t || !String(n.msg || "").trim()) return null;
  const ll = Array.isArray(n.ll) && n.ll.length === 2 && n.ll.every(Number.isFinite) ? n.ll : null;
  return {id: src + ":" + n.id, level: NOTICE_LEVELS.some(l => l[0] === n.level) ? n.level : "info", title: String(n.title || "").slice(0, 80),
    msg: String(n.msg).slice(0, 600), c: n.c || "ALL", areas: Array.isArray(n.areas) ? n.areas.filter(a => IX.areaById[a]) : [],
    ll, km: ll ? Math.min(300, Math.max(1, +n.km || 10)) : 0, agency: n.agencyName || agencies().find(a => a.id === n.agency)?.n || n.agency || "Open Tracker",
    at, t, expires: n.expires || ""};
}
function publicNotices() {
  const now = Date.now();
  const out = data("notifications").map(n => normNotice(n, "fl"))
    .concat(approvedPosts("warning").filter(p => p.push).map(p => normNotice({id: p.uid + "-" + p.id, level: p.level, title: "", msg: p.msg, c: p.c, areas: p.areas, agencyName: p.agency.n, at: p.at, expires: p.expires}, "ag")))
    .concat((window.WEBAPP?.notices() || []).map(n => normNotice(n, "web")));
  return out.filter(n => n && (!n.expires || Date.parse(n.expires) > now)).sort((a, b) => b.t - a.t);
}
function noticeMatches(n, p) {
  const c = placeCountry(p);
  if (n.c !== "ALL" && c && n.c !== c) return false;
  if (!n.areas.length && !n.ll) return true;                            /* whole country */
  if (p.type === "wc") return true;                                     /* following a whole country */
  const hs = placeHot(p);
  const regs = new Set(p.type === "area" ? [p.id] : hs.map(h => h.r));
  if (n.areas.some(a => regs.has(a))) return true;
  if (n.ll) return (hs.length ? hs.map(h => h.ll) : [placeCenter(p).ll]).some(ll => km(ll, n.ll) <= n.km);
  return false;
}
/* notices for this person: anything touching a saved place; with no saved places, everything current */
function noticesForMe() {
  const mine = myPlaces();
  const all = publicNotices();
  if (!mine.length) return all.map(n => ({n, places: []}));
  return all.map(n => ({n, places: mine.filter(p => noticeMatches(n, p))})).filter(x => x.places.length);
}
function unseenCount() { return noticesForMe().filter(x => x.n.t > MY.seen).length; }
function noticeTitle(n) { return n.title || (NOTICE_LEVELS.find(l => l[0] === n.level) || [0, "Notice"])[1]; }
function noticeWhere(n) {
  const a = n.areas.map(id => IX.areaById[id]?.n).filter(Boolean);
  const country = n.c === "ALL" ? "every country" : countryName(n.c);
  return a.length ? a.join(", ") : n.ll ? `Within ${n.km} km of the marked spot` : "All of " + country;
}

/* live pop-up while the page is open: only notices sent after it loaded, each once */
function checkNewNotices() {
  const fresh = noticesForMe().filter(x => x.n.t >= MY.since && !MY.shown.has(x.n.id));
  fresh.forEach(x => MY.shown.add(x.n.id));
  if (!fresh.length || UI.screen === "alerts") return;
  const {n, places} = fresh[0];
  const box = document.createElement("div");
  box.className = "livealert lv-" + (n.level === "warning" ? "vhigh" : n.level === "watch" ? "high" : "low");
  box.setAttribute("role", "alert");
  box.innerHTML = `<div><b>${esc(noticeTitle(n))}${places.length ? " · " + esc(places.map(placeName).join(", ")) : ""}</b><p>${esc(n.msg)}</p><span class="small">${esc(n.agency)} · ${esc(fmtDate(n.at))}</span></div><div class="toolbar"><button class="sbtn primary" data-act="alerts">See alerts</button><button class="sbtn" data-act="live-close">Close</button></div>`;
  document.querySelectorAll(".livealert").forEach(x => x.remove());
  document.body.appendChild(box);
  header();
}

/* ---------- screens ---------- */
function alertMeHtml(p) {
  if (!placeKey(p)) return "";
  const on = isMine(p);
  return `<button class="btn ${on ? "" : "ghost"}" data-act="alert-me" aria-pressed="${on}">${ICON.bell}${on ? "You get alerts for this place · Turn off" : "Alert me about this place"}</button>`;
}
function noticeCard(n, places) {
  const lv = n.level === "warning" ? "vhigh" : n.level === "watch" ? "high" : n.level === "clear" ? "low" : "med";
  return `<article class="notice-card lv-${lv}"><div class="nc-head"><b>${esc(noticeTitle(n))}</b><span class="small">${esc(fmtDate(n.at))}</span></div>
    <p>${esc(n.msg)}</p>
    <p class="small muted">From <b>${esc(n.agency)}</b> · ${esc(noticeWhere(n))}${places?.length ? " · Matches " + esc(places.map(placeName).join(", ")) : ""}${n.expires ? " · Until " + esc(fmtDate(n.expires)) : ""}</p></article>`;
}
function viewAlerts() {
  const mine = myPlaces(), list = noticesForMe();
  MY.seen = Date.now(); saveMy();
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Alerts</h1>
    <div class="card"><h2>Places you follow</h2>
      ${mine.length ? `<ul class="plain myplaces">${mine.map(p => `<li><button class="linkbtn" data-act="open" data-type="${p.type}" data-id="${esc(p.id)}">${esc(placeName(p))}</button><button class="sbtn" data-act="unfollow" data-k="${esc(placeKey(p))}" aria-label="Stop alerts for ${esc(placeName(p))}">Remove</button></li>`).join("")}</ul>`
        : `<p>You don't follow any places yet. Open your area and tap <b>Alert me about this place</b>. Until then, you see every current alert.</p>`}
      <button class="sbtn" data-act="home">Find a place</button>
    </div>
    <div class="card"><h2>${mine.length ? "Alerts for your places" : "Current alerts"}</h2>
      ${list.length ? `<div class="stack">${list.map(x => noticeCard(x.n, x.places)).join("")}</div>` : `<p>No alerts right now${mine.length ? " for your places" : ""}. Official warnings appear here as soon as an agency sends them.</p>`}
    </div>
    <div class="card"><h2>Get alerts on your phone</h2>${window.WEBAPP ? window.WEBAPP.controlsHtml() : installGuideHtml(false)}</div>`;
}
/* how to put Open Tracker on a home screen, like Stake.com and other web apps that skip the app stores */
function installGuideHtml(hosted) {
  return `
    ${hosted ? "" : `<p class="small muted">Phone notifications come from the Open Tracker web app at its own web address. On that site, follow these steps once and Open Tracker works like an app, with no app store download.</p>`}
    <details class="howto" open><summary><b>iPhone or iPad</b> (Safari)</summary><ol>
      <li>Go to Open Tracker in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (a square with an arrow pointing up).</li>
      <li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Start Open Tracker from the new icon on your home screen.</li>
      <li>Tap <b>Turn on alerts</b> and choose <b>Allow</b>. Phone alerts need iOS 16.4 or later.</li></ol></details>
    <details class="howto"><summary><b>Android phone</b> (Chrome)</summary><ol>
      <li>Go to Open Tracker in <b>Chrome</b>.</li><li>Tap <b>Install app</b> when it appears, or tap the <b>⋮</b> menu and choose <b>Install app</b> or <b>Add to Home screen</b>.</li>
      <li>Start Open Tracker from the new icon, tap <b>Turn on alerts</b> and choose <b>Allow</b>.</li></ol></details>
    <details class="howto"><summary><b>Computer</b> (Chrome or Edge)</summary><ol>
      <li>Click the <b>install</b> icon at the right end of the address bar, or open the browser menu and choose <b>Install Open Tracker</b>.</li>
      <li>Click <b>Turn on alerts</b> and choose <b>Allow</b>.</li></ol></details>`;
}

/* ---- features/outlook.js ---- */
/* ===== Next rainy season outlook =====
   For every flood area: the chance it floods at least once in the coming rainy season, the months to watch,
   and how far water usually spreads when it does ("reach"). Method, in four steps:
   1. Climate: chance of at least one day's rain above the area's 3-day flood threshold during the rainy months
      (typical monthly rainfall → chance of a heavy day, same tail as the short-term model).
   2. Rivers and dams: the highest seasonal release chance of the dams that feed the area; big rivers by peak-month rain.
   3. History: years with a recorded flood since the record began → (flood years + 1) / (record years + 2).
      Physical and historical chances are averaged.
   4. Official outlooks: areas on the latest official high-risk lists (NIHSA Annual Flood Outlook, GMet and NiMet
      seasonal forecasts) and the ENSO state scale the odds. Administrators update these lists every year.
   The outlook ranks areas by likelihood and likely extent. It is not a flood map from terrain modelling. */
const OUTLOOK_DEFAULTS = {
  year: 2027,
  recordStart: 2015,
  enso: "neutral",
  ensoNote: "WMO (August 2026): a strong El Niño is expected to peak at the end of 2026 and last into early 2027. Its effect on the 2027 West African rainy season is not yet known.",
  lists: [
    {id: "nihsa-2026", n: "High flood risk in Nigeria's 2026 Annual Flood Outlook (NIHSA, 15 April 2026)", boost: 1.6,
      src: "https://allafrica.com/stories/202604160046.html",
      areas: ["NG-AB", "NG-AD", "NG-AN", "NG-BY", "NG-BE", "NG-BO", "NG-CR", "NG-DE", "NG-EB", "NG-ED", "NG-EN", "NG-GO", "NG-IM", "NG-JI", "NG-KD", "NG-KN", "NG-KE", "NG-KO", "NG-KW", "NG-LA", "NG-NA", "NG-NI", "NG-OG", "NG-ON", "NG-OS", "NG-OY", "NG-PL", "NG-RI", "NG-SO", "NG-TA", "NG-YO", "NG-ZA", "NG-FC"]},
    {id: "gmet-2026", n: "Above-normal rain in GMet's 2026 major rainy season forecast (southern Ghana)", boost: 1.3,
      src: "https://www.modernghana.com/news/1474145/gmet-predicts-heavy-rains-in-accra-tema-cape.html",
      areas: ["GH-AA", "GH-CP", "GH-EP"]}
  ]
};
const ENSO = {neutral: [1, "No ENSO adjustment"], elnino: [.9, "El Niño: slightly drier"], lanina: [1.15, "La Niña: slightly wetter"]};
/* how far water usually spreads, by what floods the area (km before scaling by severity and chance) */
const REACH = {flash: .8, coast: 1.5, river: 4, floodplain: 12};
const FLOODPLAIN_DAMS = ["lagdo", "niger", "bagre", "akosombo"];
const OUTLOOK_CACHE = new Map();

function outlookSettings() { return Object.assign({}, OUTLOOK_DEFAULTS, settings().outlook || {}); }
function rainyMonths(clim) { return clim.map((mm, i) => [mm, i]).filter(([mm]) => mm >= 80).map(([, i]) => i); }
/* [5, 6, 7, 9, 10] → "May to Jul and Sep to Oct"; runs may wrap around the new year */
function monthRange(ms) {
  const set = new Set(ms);
  if (!set.size) return "";
  if (set.size === 12) return "all year";
  const start = [...Array(12).keys()].find(m => set.has(m) && !set.has((m + 11) % 12));
  const runs = [];
  for (let i = 0, m = start; i < 12; i++, m = (m + 1) % 12) {
    if (!set.has(m)) continue;
    const last = runs[runs.length - 1];
    if (last && (last[1] + 1) % 12 === m) last[1] = m; else runs.push([m, m]);
  }
  const short = m => MONTHS[m].slice(0, 3);
  return runs.map(([a, b]) => a === b ? MONTHS[a] : `${short(a)} to ${short(b)}`).join(" and ");
}
const odds = p => p / Math.max(1e-6, 1 - p), fromOdds = o => o / (1 + o);

function outlookFor(h) {
  const o = outlookSettings(), key = h.id;
  if (OUTLOOK_CACHE.has(key)) return OUTLOOK_CACHE.get(key);
  const st = settings();
  const clim = (st.climate[h.z] || FT.climate[h.z] || {m: Array(12).fill(0)}).m;
  const drivers = h.d || [];
  const months = rainyMonths(clim);
  const causes = [];
  /* 1. climate */
  const T3 = (+h.t || 70) * (drivers.includes("coast") ? .85 : 1);
  let Pclim = 0;
  if (drivers.includes("rain")) {
    let q = 1;
    months.forEach(m => { q *= Math.pow(1 - pDay(clim[m], T3, st.tail), 30); });
    Pclim = 1 - q;
    causes.push({k: "rain", p: Pclim, t: months.length ? `The rainy season here usually runs ${monthRange(months)}; ${Pclim >= .6 ? "a downpour big enough to flood this area is likely in most years" : Pclim >= .3 ? "downpours big enough to flood this area come in some years" : "downpours big enough to flood this area are uncommon"}.` : "Little rain falls here in a typical year."});
  }
  /* 2. dams and rivers */
  let Pdam = 0, damMonths = [];
  drivers.filter(d => IX.damById[d]).forEach(id => {
    const dam = IX.damById[id], s = dam.season || [];
    const p = Math.max(0, ...s);
    if (p > Pdam) { Pdam = p; damMonths = s.map((x, i) => [x, i]).filter(([x]) => x >= .3).map(([, i]) => i); }
    causes.push({k: "dam", p, t: `${dam.n} ${p >= .5 ? "releases water in most rainy seasons" : p >= .2 ? "sometimes releases water in the rainy season" : "rarely releases water"}${damMonths.length ? `, usually ${monthRange(damMonths)}` : ""}.`});
  });
  let Priver = 0;
  if (drivers.includes("river")) {
    Priver = Math.min(.6, Math.max(0, (Math.max(...clim) - 120) / 350));
    if (Priver > .05) causes.push({k: "river", p: Priver, t: "Rivers here rise every rainy season and can overflow in wet years."});
  }
  const Pphys = 1 - (1 - Pclim) * (1 - Pdam) * (1 - Priver);
  /* 3. history */
  const evs = IX.evByHot[h.id] || [];
  const years = new Set(evs.map(e => e.year).filter(y => y >= o.recordStart));
  const span = Math.max(1, NOW.getFullYear() - o.recordStart + 1);
  const Phist = (years.size + 1) / (span + 2);
  causes.push({k: "history", p: Phist, t: years.size ? `Flooded in ${years.size} of the last ${span} years in our records (most recently ${Math.max(...years)}).` : `No flood recorded here in our records since ${o.recordStart}.`});
  /* 4. official outlooks and ENSO */
  let O = odds((Pphys + Phist) / 2);
  (o.lists || []).forEach(l => { if ((l.areas || []).includes(h.r)) { O *= +l.boost || 1; causes.push({k: "official", p: 0, t: `${l.n}.`}); } });
  const enso = ENSO[o.enso] || ENSO.neutral;
  O *= enso[0];
  const P = Math.min(.97, fromOdds(O));
  /* level: chance weighted a little by how bad floods get here */
  const sev = Math.min(3, Math.max(1, +h.sev || 2));
  const Pw = P * (.7 + .1 * sev);
  const level = Pw >= .65 ? "vhigh" : Pw >= .45 ? "high" : Pw >= .25 ? "med" : "low";
  /* reach */
  const type = drivers.some(d => FLOODPLAIN_DAMS.includes(d)) ? "floodplain" : drivers.includes("river") ? "river" : drivers.includes("coast") ? "coast" : "flash";
  const reach = Math.round(REACH[type] * (.6 + .2 * sev) * (.8 + .4 * P) * 10) / 10;
  const watch = [...new Set(months.filter(m => pDay(clim[m], T3, st.tail) >= .01).concat(damMonths))];
  const E = Math.min(1, (+h.exp || 2) / 3), V = Math.min(1, Math.max(0, +h.vul || .5));
  const r = {P, Pclim, Pdam, Priver, Phist, E, V, H: Math.min(1, evs.length / 4), score: P * (st.wE * E + st.wV * V), level, causes, nEvents: evs.length,
    reach, reachType: type, months: watch.length ? watch : months, outlook: true};
  OUTLOOK_CACHE.set(key, r);
  return r;
}
const REACH_WORDS = {flash: "streets and low ground nearby", coast: "the shore and lagoon edges", river: "the riverbanks and nearby low ground", floodplain: "the river floodplain"};
function reachText(r) { return `If it floods, water usually spreads about ${r.reach < 1 ? Math.round(r.reach * 1000) + " m" : r.reach + " km"} across ${REACH_WORDS[r.reachType]}.`; }

/* ---------- public screen: the season ahead, both countries ---------- */
function viewOutlook() {
  const o = outlookSettings();
  const block = c => {
    const rows = IX.hot.filter(h => h.c === c).map(h => ({h, r: outlookFor(h)})).sort((a, b) => b.r.P - a.r.P);
    const counts = LEVELS.map(l => [l, rows.filter(x => x.r.level === l.k).length]).filter(x => x[1]);
    return `<div class="card"><h2>${esc(FT.countries[c].n)}</h2>
      <p class="small">${counts.map(([l, n]) => `${n} ${l.n.toLowerCase()}`).join(" · ")} — across ${rows.length} known flood areas.</p>
      <div class="results">${rows.slice(0, 12).map(({h, r}) => `<button class="pick" data-act="open-outlook" data-id="${esc(h.id)}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))} · about ${Math.round(r.P * 100)}% chance · reach ${r.reach} km · ${esc(monthRange(r.months))}</span></span>${chip(r.level)}</button>`).join("")}</div>
      <button class="btn" data-act="outlook-map" data-k="${c}">See the ${esc(FT.countries[c].n)} outlook on the map</button></div>`;
  };
  return `<button class="back" data-act="back">← Back</button>
    <h1>${o.year} rainy season outlook</h1>
    <p>Where flooding is most likely in the coming rainy season, when to watch, and how far the water can reach. Tap an area for the reasons.</p>
    ${block("GH")}${block("NG")}
    <div class="card"><h2>How this outlook is made</h2>
      <p class="small">It combines typical rainfall for each area, river and dam patterns, the floods recorded since ${o.recordStart}, and the latest official outlooks: ${(o.lists || []).map(l => `<a href="${esc(safeUrl(l.src))}" target="_blank" rel="noopener">${esc(l.n)}</a>`).join("; ")}. ${esc(o.ensoNote || "")}</p>
      <p class="small muted">Official ${o.year} outlooks come out between February and April ${o.year} (GMet, NiMet, NIHSA). This outlook is updated as soon as they are published. It ranks areas by likelihood; it is not a detailed flood map.</p></div>`;
}

/* ---- features/contribute.js ---- */
/* ===== Open-source contributions: flood reports, corrections, suggestions and data sources from the public =====
   Inside claude.ai each person writes only their own document, contributions/<their id> (database rule);
   administrators read all of them and record decisions in "reviews", which only they can write.
   On the self-hosted web app the same form posts to the server (window.WEBAPP.contribute). */
const CONTRIB_TYPES = [
  ["report", "Report a flood", "Tell us where it flooded, when, and how deep."],
  ["correction", "Suggest a correction", "Something wrong or missing about a place?"],
  ["suggestion", "Suggestion box", "Ideas to make Open Tracker better."],
  ["data", "Share a data source", "Rain gauges, river levels, maps or studies we can use."]
];
const DEPTHS = [["", "Not sure"], ["ankle", "Up to the ankles"], ["knee", "Up to the knees"], ["waist", "Up to the waist"], ["chest", "Up to the chest"], ["above", "Over a person's head"]];
const SUGGEST_CATS = [["feature", "A new feature"], ["data", "Data or information"], ["design", "Easier to use"], ["other", "Something else"]];
const CONTRIB = {mine: null, sub: null};

/* the contributor's own items (claude.ai): one live subscription */
function syncContribSub() {
  if (!DB.api || !DB.uid || CONTRIB.sub) return;
  try { CONTRIB.sub = DB.api.doc("contributions/" + DB.uid).onSnapshot(s => { CONTRIB.mine = s.exists ? s.data() : null; afterData(); }, () => {}); } catch (e) {}
}
const reviewKey = (uid, id) => "r" + APPROVAL.fnv(uid + "/" + id) + APPROVAL.fnv(id + "#" + uid);
function reviewOf(uid, id) { return data("reviews").find(r => r.id === reviewKey(uid, id)) || null; }

/* same rules as the server, so people see problems before sending */
function readContribution(form, type) {
  const v = id => (form.querySelector(id)?.value || "").trim();
  const item = {type, text: v("#c-text")};
  if (!item.text) throw new Error(type === "suggestion" ? "Write your idea." : "Tell us what happened.");
  if (item.text.length > 1000) throw new Error("Please keep it under 1,000 characters.");
  const placeKeyV = form.querySelector("#c-place")?.value || "";
  if (placeKeyV) { const p = keyPlace(placeKeyV); if (p) item.place = {type: p.type, id: p.id}; }
  const placeText = v("#c-where"); if (placeText) item.placeText = placeText.slice(0, 120);
  const date = v("#c-date");
  if (date) { if (Date.parse(date) > Date.now() + 864e5) throw new Error("The date can't be in the future."); item.date = date; }
  const depth = v("#c-depth"); if (depth) item.depth = depth;
  const cat = v("#c-cat"); if (cat) item.category = cat;
  const src = v("#c-src");
  if (src) { if (!safeUrl(src)) throw new Error("The link must start with http:// or https://"); item.src = src.slice(0, 500); }
  if (type === "data" && !item.src) throw new Error("Add a link to the data.");
  if (type === "report" && !item.place && !item.placeText) throw new Error("Say where the flooding is.");
  return item;
}
async function submitContribution(form) {
  const err = form.querySelector("#c-err");
  try {
    const item = readContribution(form, form.dataset.type);
    item.at = new Date().toISOString();
    if (window.WEBAPP) await window.WEBAPP.contribute(item);
    else {
      if (!DB.api || !DB.uid) throw new Error("Sign in to send contributions here, or use the Open Tracker website.");
      const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const ref = DB.api.doc("contributions/" + DB.uid);
      const exists = (await ref.get()).exists;
      if (exists) await ref.update({items: {[id]: item}});
      else await ref.set({items: {[id]: item}});
    }
    UI.contrib = {type: null, sent: true};
    render(); window.scrollTo(0, 0);
  } catch (e) {
    if (err) err.textContent = ["invalid_argument", "not_granted"].includes(e?.code) ? "Your access to this page can't send contributions. Use the Open Tracker website, or ask the owner for Contributor access." : e?.message && !e.code ? e.message : "That didn't send. Check your connection and try again.";
  }
}

/* ---------- public screen ---------- */
function viewContribute() {
  const c = UI.contrib;
  const head = `<button class="back" data-act="back">← Back</button><h1>Help improve Open Tracker</h1>`;
  if (c.sent) return `${head}<div class="notice info">${ICON.info}<div><b>Thank you. We've received it.</b>Our team checks every contribution against official sources before anything changes on the map.</div></div>
    <button class="btn" data-act="contrib-type" data-k="">Send something else</button>${myContribsHtml()}`;
  if (!c.type) return `${head}
    <p>Open Tracker is open source. Anyone can help: tell us about flooding you've seen, fix mistakes, or share ideas and data. Every contribution is checked before it appears.</p>
    <div class="results">${CONTRIB_TYPES.map(([k, n, s]) => `<button class="pick" data-act="contrib-type" data-k="${k}"><span class="grow"><span class="t">${n}</span><span class="s">${s}</span></span></button>`).join("")}</div>
    ${myContribsHtml()}`;
  const p = !c.noPlace && UI.place && placeKey(UI.place) ? UI.place : null;
  const placeField = p ? `<input type="hidden" id="c-place" value="${esc(placeKey(p))}"><p><b>Place:</b> ${esc(placeName(p))} <button type="button" class="linkbtn" data-act="contrib-noplace">Change</button></p>`
    : `<label class="field"><span>Where? Town, area or street</span><input id="c-where" maxlength="120" autocomplete="off"></label>`;
  const fields = {
    report: `${placeField}
      <label class="field"><span>When did it flood?</span><input id="c-date" type="date" max="${new Date().toISOString().slice(0, 10)}"></label>
      <label class="field"><span>How deep was the water?</span><select id="c-depth">${DEPTHS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>
      <label class="field"><span>What happened?</span><textarea id="c-text" maxlength="1000" placeholder="For example: the drain overflowed and shops were flooded for two hours."></textarea></label>
      <label class="field"><span>Link to a photo, video or news report (helps us check it)</span><input id="c-src" type="url" maxlength="500" placeholder="https://"></label>`,
    correction: `${placeField}
      <label class="field"><span>What is wrong, and what should it say?</span><textarea id="c-text" maxlength="1000"></textarea></label>
      <label class="field"><span>Where can we check this? (link, optional)</span><input id="c-src" type="url" maxlength="500" placeholder="https://"></label>`,
    suggestion: `<label class="field"><span>Your idea is about</span><select id="c-cat">${SUGGEST_CATS.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label>
      <label class="field"><span>Your suggestion</span><textarea id="c-text" maxlength="1000"></textarea></label>`,
    data: `<label class="field"><span>What data is it, and who publishes it?</span><textarea id="c-text" maxlength="1000"></textarea></label>
      <label class="field"><span>Link to the data</span><input id="c-src" type="url" maxlength="500" placeholder="https://" required></label>`
  }[c.type];
  return `${head}
    <form class="card" id="contrib-form" data-type="${c.type}" novalidate>
      <h2>${esc(CONTRIB_TYPES.find(t => t[0] === c.type)[1])}</h2>
      ${fields}
      <p class="small muted">Please don't include names, phone numbers or other personal details.</p>
      <p class="small" id="c-err" role="alert" style="color:var(--vhigh)"></p>
      <div class="toolbar"><button class="btn primary inline" type="submit">Send</button><button class="btn inline" type="button" data-act="contrib-type" data-k="">Cancel</button></div>
    </form>`;
}
function myContribsHtml() {
  const items = Object.entries((window.WEBAPP ? window.WEBAPP.sentItems() : CONTRIB.mine?.items) || {}).sort((a, b) => String(b[1].at).localeCompare(String(a[1].at)));
  if (!items.length) return "";
  const label = s => ({accepted: "Accepted, thank you", rejected: "Not used"}[s] || "Waiting to be checked");
  return `<div class="card"><h2>What you've sent</h2><ul class="plain">${items.slice(0, 20).map(([id, it]) => {
    const r = reviewOf(DB.uid, id);
    return `<li><b>${esc(CONTRIB_TYPES.find(t => t[0] === it.type)?.[1] || it.type)}</b> · ${esc(fmtDate(it.at))}<br><span class="small">${esc(it.text.slice(0, 140))}</span><br><span class="small muted">${label(r?.status)}${r?.note ? " · " + esc(r.note) : ""}</span></li>`;
  }).join("")}</ul></div>`;
}
function contributeCta(p) {
  return `<div class="card contribute-cta"><h2>Seen something we should know?</h2><div class="toolbar">
    <button class="sbtn" data-act="contribute" data-k="report">Report a flood${p ? " here" : ""}</button>
    ${p ? `<button class="sbtn" data-act="contribute" data-k="correction">Suggest a correction</button>` : ""}
    <button class="sbtn" data-act="contribute" data-k="suggestion">Suggestion box</button></div></div>`;
}

/* ---------- admin: every contribution, newest first ---------- */
const AD_CONTRIB = {rows: null, loading: false, filter: "new"};
async function loadContribs() {
  if (AD_CONTRIB.loading) return;
  AD_CONTRIB.loading = true;
  try {
    const snap = await DB.api.collection("contributions").get();
    AD_CONTRIB.rows = [];
    snap.docs.forEach(d => Object.entries(d.data()?.items || {}).forEach(([id, it]) => { if (it && typeof it.text === "string") AD_CONTRIB.rows.push(Object.assign({}, it, {id, uid: d.id})); }));
    AD_CONTRIB.rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  } catch (e) { AD_CONTRIB.rows = []; toast("Contributions could not be loaded."); }
  AD_CONTRIB.loading = false;
  if (UI.mode === "admin" && UI.admin.tab === "contributions") render();
}
function adContributions() {
  if (!AD_CONTRIB.rows) { loadContribs(); return `<div class="card"><p>Loading contributions…</p></div>`; }
  const st = r => reviewOf(r.uid, r.id)?.status || "new";
  const rows = AD_CONTRIB.rows.filter(r => !AD_CONTRIB.filter || st(r) === AD_CONTRIB.filter);
  ensureNames(rows.map(r => r.uid));
  const counts = ["new", "accepted", "rejected"].map(s => [s, AD_CONTRIB.rows.filter(r => st(r) === s).length]);
  return `<div class="card"><h2>Contributions from the public</h2>
    <p class="small muted">Flood reports, corrections, suggestions and data sources. Check sources before changing data. "Add as past flood" opens a new record filled in from the report.</p>
    <div class="toolbar"><label class="field"><span>Show</span><select id="ct-filter">${[["new", "New"], ["accepted", "Accepted"], ["rejected", "Rejected"], ["", "All"]].map(([k, n]) => `<option value="${k}" ${AD_CONTRIB.filter === k ? "selected" : ""}>${n}${k ? ` (${counts.find(c => c[0] === k)[1]})` : ""}</option>`).join("")}</select></label>
      <button class="sbtn" data-act="ct-reload" style="align-self:end">Refresh</button></div>
    <div class="stack">${rows.slice(0, 200).map(r => {
      const rv = reviewOf(r.uid, r.id);
      const where = r.place ? placeName(keyPlace(r.place.type + ":" + r.place.id) || {}) || r.place.id : r.placeText || "";
      return `<article class="notice-card"><div class="nc-head"><b>${esc(CONTRIB_TYPES.find(t => t[0] === r.type)?.[1] || r.type)}${where ? " · " + esc(where) : ""}</b><span class="small">${esc(fmtDate(r.at))}</span></div>
        <p>${esc(r.text)}</p>
        <p class="small muted">From ${esc(nameOf(r.uid))}${r.date ? " · flooded " + esc(r.date) : ""}${r.depth ? " · water " + esc(DEPTHS.find(d => d[0] === r.depth)?.[1].toLowerCase() || r.depth) : ""}${r.category ? " · " + esc(SUGGEST_CATS.find(c => c[0] === r.category)?.[1] || r.category) : ""}${rv ? " · " + esc(rv.status) + (rv.note ? ": " + esc(rv.note) : "") : ""}</p>
        ${safeUrl(r.src) ? `<a class="small" href="${esc(safeUrl(r.src))}" target="_blank" rel="noopener noreferrer">Open their source</a>` : ""}
        <div class="toolbar"><input id="ct-note-${esc(r.id)}" maxlength="300" placeholder="Note to the contributor (optional)" aria-label="Note">
          <button class="sbtn primary" data-act="ct-decide" data-ok="accepted" data-uid="${esc(r.uid)}" data-id="${esc(r.id)}">Accept</button>
          <button class="sbtn danger" data-act="ct-decide" data-ok="rejected" data-uid="${esc(r.uid)}" data-id="${esc(r.id)}">Reject</button>
          ${r.type === "report" && AUTH.can("data.edit") ? `<button class="sbtn" data-act="ct-event" data-uid="${esc(r.uid)}" data-id="${esc(r.id)}">Add as past flood</button>` : ""}
          ${r.place?.type === "hotspot" && AUTH.can("data.edit") ? `<button class="sbtn" data-act="ad-edit" data-k="hotspots" data-id="${esc(r.place.id)}">Open the place record</button>` : ""}</div></article>`;
    }).join("") || `<p>Nothing here.</p>`}</div></div>`;
}
async function contribAct(act, el) {
  try {
    if (act === "ct-reload") { AD_CONTRIB.rows = null; return render(); }
    if (act === "ct-decide") {
      REPO.require(AUTH.can("contributions.review"), "review contributions");
      const {uid, id, ok} = el.dataset;
      const note = ($("#ct-note-" + CSS.escape(id))?.value || "").trim().slice(0, 300);
      await DB.api.collection("reviews").doc(reviewKey(uid, id)).set({uid, item: id, status: ok, note, at: new Date().toISOString(), by: DB.uid || null});
      await REPO.audit(ok === "accepted" ? "accepted contribution" : "rejected contribution", "contributions", uid + "/" + id, null, {note});
      toast(ok === "accepted" ? "Accepted." : "Rejected.");
      return render();
    }
    if (act === "ct-event") {
      const r = AD_CONTRIB.rows.find(x => x.uid === el.dataset.uid && x.id === el.dataset.id);
      if (!r) return;
      const p = r.place ? keyPlace(r.place.type + ":" + r.place.id) : null;
      const yr = r.date ? +r.date.slice(0, 4) : null;
      UI.admin.tab = "events"; UI.admin.confirm = null;
      UI.admin.edit = {coll: "events", isNew: true, rec: {id: "ev-" + Date.now().toString(36), t: "Community report" + (p ? ": " + placeName(p) : r.placeText ? ": " + r.placeText : ""),
        c: (p && placeCountry(p)) || "GH", date: r.date || "", year: yr, ids: p?.type === "hotspot" ? [p.id] : [], impact: r.text + (r.depth ? ` Water ${DEPTHS.find(d => d[0] === r.depth)?.[1].toLowerCase()}.` : ""), src: safeUrl(r.src)}};
      return render();
    }
  } catch (e) { toast(errText(e)); }
}

/* ---- features/replay.js ---- */
/* ===== Flood replays: watch a flood grow and shrink =====
   Two kinds, one player:
   - model:     hour by hour, water depth from the SFINCS flood model (modelling/ makes the files)
   - satellite: date by date, water outlines mapped from satellites (satellite/ makes the files)
   A replay = a small record in "replays" (titles, times, areas covered) + one map layer per step, kept apart
   in "geo" and loaded only when someone watches. Imported from a replay file, never typed in. */
const REPLAY_KINDS = {model: "Flood model", satellite: "Satellite map"};
const REPLAY_MAX_FRAMES = 200, REPLAY_FRAME_BYTES = 200000, REPLAY_MAX_POINTS = 40000;
const SAT_CLASSES = [{k: 1, n: "Water seen from space"}];
const RP = {cache: new Map(), timer: null, token: 0};

/* ---------- reading ---------- */
function replays() {
  /* the web app gets replays (and their layers) from its own server; claude.ai from the shared database */
  return (window.WEBAPP ? window.WEBAPP.replays() : data("replays"))
    .filter(r => r && Array.isArray(r.frames) && r.frames.length)
    .sort((a, b) => String(b.frames[0].t).localeCompare(String(a.frames[0].t)));
}
function replayById(id) { return replays().find(r => r.id === id) || null; }
const replayYear = r => +String(r.frames[0].t).slice(0, 4);
function inBbox(ll, b) { return ll[0] >= b[0] && ll[0] <= b[2] && ll[1] >= b[1] && ll[1] <= b[3]; }
/* replays that cover a place: by region/state, or by a flood area inside the replay's box */
function replaysFor(p) {
  const hs = placeHot(p);
  const regs = new Set(p.type === "area" ? [p.id] : hs.map(h => h.r));
  const pts = hs.length ? hs.map(h => h.ll) : p.type === "wp" ? [placeCenter(p).ll] : [];   /* towns anywhere: by position */
  return replays().filter(r => (r.areas || []).some(a => regs.has(a)) || (r.bbox && pts.some(ll => inBbox(ll, r.bbox))));
}
async function loadFrame(r, i) {
  const f = r.frames[i]; if (!f) return null;
  if (RP.cache.has(f.geo)) return RP.cache.get(f.geo);
  let fc = null;
  if (window.WEBAPP) fc = await window.WEBAPP.geo(f.geo);
  else if (DB.api) { const s = await DB.api.collection("geo").doc(f.geo).get(); fc = s.exists ? s.data().fc : null; }
  if (fc) RP.cache.set(f.geo, fc);
  return fc;
}
function replayClasses(r) { return r.kind === "satellite" ? SAT_CLASSES : r.classes || []; }
function frameWhen(r, i) {
  const f = r.frames[i];
  const d = new Date(f.t);
  const date = isNaN(d) ? "" : d.toLocaleDateString("en-GB", {day: "numeric", month: "long", year: "numeric"});
  if (r.kind === "model") return `${i === 0 ? "Start" : i === 1 ? "1 hour" : i + " hours"} · ${date} ${isNaN(d) ? "" : d.toISOString().slice(11, 16) + " GMT"}`;
  return date;
}

/* ---------- checking a replay file (the server applies the same rules) ---------- */
function geomPoints(g) {
  if (!g || !Array.isArray(g.coordinates)) throw new Error("A shape has no coordinates.");
  const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : null;
  if (!polys) throw new Error("Only areas (Polygon or MultiPolygon) can be shown.");
  let n = 0;
  polys.forEach(poly => poly.forEach(ring => {
    if (!Array.isArray(ring) || ring.length < 4) throw new Error("A shape has a broken outline.");
    ring.forEach(c => {
      if (!Array.isArray(c) || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) throw new Error("Coordinates must be longitude and latitude (EPSG:4326).");
      n++;
    });
  }));
  return n;
}
function checkFrameFc(fc, classes) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features) || fc.features.length > 50) throw new Error("Each step needs a GeoJSON FeatureCollection (at most 50 shapes).");
  let pts = 0;
  const ks = new Set(classes.map(c => c.k));
  fc.features.forEach(f => { pts += geomPoints(f.geometry); if (!ks.has(f.properties?.k)) throw new Error("A shape has an unknown depth class."); });
  if (pts > REPLAY_MAX_POINTS || JSON.stringify(fc).length > REPLAY_FRAME_BYTES) throw new Error("A step is too detailed. Simplify the shapes and try again.");
}
function validateReplay(b) {
  if (!b || b.app !== "OpenTracker-replay" || b.version !== 1 || !b.replay || !Array.isArray(b.frames)) throw new Error("That isn't an Open Tracker replay file.");
  const r = b.replay, s = (v, n) => typeof v === "string" ? v.trim().slice(0, n) : "";
  if (!/^[a-z0-9-]{2,80}$/.test(r.id || "")) throw new Error("The replay id must use lowercase letters, numbers and dashes.");
  if (!REPLAY_KINDS[r.kind]) throw new Error("The replay kind must be model or satellite.");
  const bbox = Array.isArray(r.bbox) && r.bbox.length === 4 && r.bbox.every(Number.isFinite) && r.bbox[0] < r.bbox[2] && r.bbox[1] < r.bbox[3] ? r.bbox : null;
  if (!bbox) throw new Error("The replay needs a valid bounding box.");
  const classes = r.kind === "satellite" ? SAT_CLASSES : (Array.isArray(r.classes) ? r.classes : []).filter(c => c && [1, 2, 3, 4].includes(c.k)).map(c => ({k: c.k, n: s(c.n, 60), min: Number.isFinite(c.min) ? c.min : null, max: Number.isFinite(c.max) ? c.max : null}));
  if (!classes.length) throw new Error("The replay has no depth classes.");
  if (!b.frames.length || b.frames.length > REPLAY_MAX_FRAMES) throw new Error(`A replay needs 1 to ${REPLAY_MAX_FRAMES} steps.`);
  const frames = b.frames.map(f => {
    if (!f || isNaN(Date.parse(f.t))) throw new Error("Each step needs a valid time.");
    checkFrameFc(f.fc, classes);
    return {t: new Date(f.t).toISOString(), label: s(f.label, 40), km2: Number.isFinite(f.km2) && f.km2 >= 0 ? Math.round(f.km2 * 100) / 100 : 0,
      m3: Number.isFinite(f.m3) && f.m3 >= 0 ? Math.round(f.m3) : null, fc: f.fc};
  }).sort((x, y) => x.t.localeCompare(y.t));
  return {
    meta: {id: r.id, kind: r.kind, title: s(r.title, 120) || "Flood replay", c: /^[A-Z]{2}$/.test(r.c || "") ? r.c : "ALL",
      areas: (Array.isArray(r.areas) ? r.areas : []).filter(a => IX.areaById[a]), bbox: bbox.map(v => Math.round(v * 1e5) / 1e5),
      source: s(r.source, 200), notes: s(r.notes, 500), link: safeUrl(r.link) || "",
      assumptions: (Array.isArray(r.assumptions) ? r.assumptions : []).slice(0, 10).map(a => s(a, 300)).filter(Boolean),
      classes, frameMinutes: r.kind === "model" ? 60 : null, made: s(r.made, 40), madeWith: s(r.madeWith, 80)},
    frames
  };
}

/* ---------- a single satellite outline (GeoJSON) made into a step, simplified to fit ---------- */
function rdp(pts, tol) {   /* Ramer–Douglas–Peucker on one ring, in degrees */
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L; if (d > best) { best = d; bi = i; } }
    if (best > tol) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  const out = pts.filter((_, i) => keep[i]);
  return out.length >= 4 ? out : null;
}
function ringKm2(ring) {   /* shoelace on a local flat projection */
  const lat0 = ring[0][1] * Math.PI / 180, kx = 111.32 * Math.cos(lat0), ky = 110.574;
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * kx * ring[i + 1][1] * ky - ring[i + 1][0] * kx * ring[i][1] * ky;
  return Math.abs(a) / 2;
}
function outlineToFrame(geojson) {
  const geoms = [];
  const take = g => { if (!g) return; if (g.type === "FeatureCollection") g.features.forEach(f => take(f.geometry)); else if (g.type === "Feature") take(g.geometry); else if (g.type === "Polygon") geoms.push([g.coordinates]); else if (g.type === "MultiPolygon") geoms.push(g.coordinates); else if (g.type === "GeometryCollection") g.geometries.forEach(take); };
  take(geojson);
  const polys = [].concat(...geoms);
  if (!polys.length) throw new Error("The file has no areas (Polygon or MultiPolygon).");
  polys.forEach(p => p.forEach(ring => ring.forEach(c => { if (!Array.isArray(c) || Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) throw new Error("Coordinates must be longitude and latitude (EPSG:4326)."); })));
  const km2 = polys.reduce((sum, p) => sum + Math.max(0, ringKm2(p[0]) - p.slice(1).reduce((h, r) => h + ringKm2(r), 0)), 0);
  for (let tol = 0.00005; tol < 0.05; tol *= 1.7) {
    const simple = polys.map(p => p.map(r => rdp(r, tol)).filter(Boolean)).filter(p => p.length && p[0]);
    const fc = {type: "FeatureCollection", features: [{type: "Feature", properties: {k: 1}, geometry: {type: "MultiPolygon", coordinates: simple.map(p => p.map(r => r.map(c => [Math.round(c[0] * 1e5) / 1e5, Math.round(c[1] * 1e5) / 1e5])))}}]};
    try { checkFrameFc(fc, SAT_CLASSES); return {fc, km2: Math.round(km2 * 100) / 100}; } catch (e) { if (!/too detailed/.test(e.message)) throw e; }
  }
  throw new Error("That outline is too detailed even after simplifying. Cut it to the flooded area first.");
}
function bboxOfFc(fc, prev) {
  const b = prev ? prev.slice() : [180, 90, -180, -90];
  fc.features.forEach(f => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(p => p[0].forEach(([x, y]) => { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); })));
  return b.map(v => Math.round(v * 1e5) / 1e5);
}

/* ---------- saving (administrators; agency editors ask an administrator) ---------- */
const geoId = id => `${id}--${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
async function saveReplay(meta, frames, keepFrames = []) {
  REPO.require(AUTH.can("data.edit") && !APPROVAL.gate(), "publish flood replays");
  const stored = [];
  for (const f of frames) {
    const id = geoId(meta.id);
    await DB.api.collection("geo").doc(id).set({fc: f.fc, replay: meta.id});
    stored.push({t: f.t, label: f.label, km2: f.km2, m3: Number.isFinite(f.m3) ? f.m3 : null, geo: id});
  }
  const all = keepFrames.concat(stored).sort((a, b) => a.t.localeCompare(b.t));
  await REPO.set("replays", Object.assign({}, meta, {frames: all}));
  RP.cache.clear();
}
async function importReplayFile(file) {
  if (file.size > 20e6) throw new Error("That file is too large (20 MB at most).");
  const v = validateReplay(JSON.parse(await file.text()));
  const old = data("replays").find(r => r.id === v.meta.id);
  await saveReplay(v.meta, v.frames);
  if (old) await deleteGeo(old.frames);    /* a re-import replaces the old layers */
  return v;
}
async function addOutline(form) {
  const v = id => (form.querySelector(id)?.value || "").trim();
  const file = form.querySelector("#ro-file")?.files?.[0];
  if (!file) throw new Error("Choose a GeoJSON file.");
  if (file.size > 30e6) throw new Error("That file is too large (30 MB at most).");
  const date = v("#ro-date");
  if (!date || isNaN(Date.parse(date))) throw new Error("Enter the date the satellite saw the water.");
  let gj; try { gj = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't GeoJSON."); }
  const {fc, km2} = outlineToFrame(gj);
  const frame = {t: new Date(date).toISOString(), label: "", km2, fc};
  const target = v("#ro-target");
  if (target) {
    const r = data("replays").find(x => x.id === target && x.kind === "satellite");
    if (!r) throw new Error("Choose a satellite replay to add to.");
    const meta = Object.assign({}, r, {bbox: bboxOfFc(fc, r.bbox)});
    delete meta.frames;
    return saveReplay(meta, [frame], r.frames);
  }
  const title = v("#ro-title"), id = v("#ro-id");
  if (!title) throw new Error("Give the replay a title, for example “Accra floods, June 2026”.");
  if (!/^[a-z0-9-]{2,80}$/.test(id)) throw new Error("The short name can use lowercase letters, numbers and dashes.");
  if (data("replays").some(r => r.id === id)) throw new Error("That short name is already used.");
  const src = v("#ro-link");
  if (src && !safeUrl(src)) throw new Error("The product link must start with http:// or https://");
  return saveReplay({id, kind: "satellite", title: title.slice(0, 120), c: v("#ro-c") || "GH", areas: v("#ro-areas").split(",").map(s => s.trim()).filter(a => IX.areaById[a]),
    bbox: bboxOfFc(fc), source: v("#ro-source").slice(0, 200) || "Satellite flood map", notes: "", link: src, assumptions: [], classes: SAT_CLASSES, frameMinutes: null, made: new Date().toISOString().slice(0, 10), madeWith: ""}, [frame]);
}
async function deleteGeo(frames) { for (const f of frames || []) await DB.api.collection("geo").doc(f.geo).delete().catch(() => {}); }
async function deleteReplay(id) {
  const r = data("replays").find(x => x.id === id); if (!r) return;
  await REPO.del("replays", id);
  await deleteGeo(r.frames);
  RP.cache.clear();
}

/* ---------- public screens ---------- */
function replayPick(r) {
  const peak = Math.max(...r.frames.map(f => f.km2));
  const span = r.kind === "model" ? `${r.frames.length - 1} hours` : `${r.frames.length} satellite map${r.frames.length > 1 ? "s" : ""}`;
  return `<button class="pick" data-act="replay-open" data-id="${esc(r.id)}"><span class="grow"><span class="t">${esc(r.title)}</span><span class="s">${esc(REPLAY_KINDS[r.kind])} · ${esc(frameWhen(r, 0).split(" · ").pop())} · ${span} · up to ${peak} km² under water</span></span><span class="chip">Watch</span></button>`;
}
function viewReplays() {
  if (UI.replay.id && replayById(UI.replay.id)) return viewReplayPlayer(replayById(UI.replay.id));
  const all = replays(), sats = all.filter(r => r.kind === "satellite"), models = all.filter(r => r.kind === "model");
  return `<button class="back" data-act="back">← Back</button>
    <h1>Watch floods over time</h1>
    <button class="btn" data-act="years-map">Play recorded floods year by year</button>
    <div class="card"><h2>Real floods seen from space</h2><p class="small muted">Water outlines mapped from satellite images, date by date. Radar satellites such as Sentinel-1 see through cloud.</p>
      ${sats.length ? `<div class="results">${sats.map(replayPick).join("")}</div>` : `<p>No satellite maps published yet. The team adds them from Copernicus and UNOSAT flood maps.</p>`}</div>
    <div class="card"><h2>What a storm would do, hour by hour</h2><p class="small muted">From the Open Tracker flood model (SFINCS): rain falls, water runs downhill, gathers in low places, then drains away.</p>
      ${models.length ? `<div class="results">${models.map(replayPick).join("")}</div>` : `<p>No model runs published yet for Accra, Cape Coast or Lagos.</p>`}</div>`;
}
function viewReplayPlayer(r) {
  const n = r.frames.length, i = Math.min(UI.replay.i, n - 1);
  const classes = replayClasses(r);
  return `<button class="back" data-act="replay-close">← All replays</button>
    <h1>${esc(r.title)}</h1>
    <p class="small muted">${esc(REPLAY_KINDS[r.kind])} · ${esc(r.source)}${r.link ? ` · <a href="${esc(r.link)}" target="_blank" rel="noopener">Original map</a>` : ""}</p>
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Flood replay map"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">Map data: Natural Earth · MapLibre</div></div>
    <div class="card player">
      <div class="player-row">
        <button class="btn primary inline" id="rp-play" data-act="replay-play" aria-pressed="${!!RP.timer}">${RP.timer ? "❚❚ Pause" : "▶ Play"}</button>
        <button class="sbtn" data-act="replay-step" data-d="-1" aria-label="Step back">◀</button>
        <input id="rp-slider" type="range" min="0" max="${n - 1}" value="${i}" aria-label="${r.kind === "model" ? "Hour" : "Date"}">
        <button class="sbtn" data-act="replay-step" data-d="1" aria-label="Step forward">▶</button>
      </div>
      <p class="player-now" id="rp-now" aria-live="polite">${frameNow(r, i)}</p>
      <div id="rp-spark">${sparkline(r, i)}</div>
      <div class="legend">${classes.map(c => `<span><i class="sw w${c.k}${r.kind === "satellite" ? " sat" : ""}"></i>${esc(c.n)}</span>`).join("")}</div>
    </div>
    <details class="card"><summary><b>How this was made</b></summary>
      <ul class="plain">${(r.assumptions || []).map(a => `<li class="small">${esc(a)}</li>`).join("")}${r.notes ? `<li class="small">${esc(r.notes)}</li>` : ""}${r.madeWith ? `<li class="small muted">${esc(r.madeWith)}${r.made ? " · " + esc(r.made.slice(0, 10)) : ""}</li>` : ""}</ul>
      <p class="small muted">${r.kind === "model" ? "A model shows what this storm would do on today's ground. Real floods also depend on blocked drains, rivers and tides." : "Satellites see open water; water under trees or between buildings can be missed."}</p></details>`;
}
/* one step in words: when, area under water and, for flood projections, the volume of water */
function frameNow(r, i) {
  const f = r.frames[i];
  return `${esc(frameWhen(r, i))} · <b>${f.km2} km²</b> under water${Number.isFinite(f.m3) && f.m3 > 0 ? ` · <b>${esc(fmtVolume(f.m3))}</b> of water` : ""}`;
}
/* area under water over the replay; a dot marks the step on screen */
function sparkline(r, i) {
  const W = 640, H = 90, n = r.frames.length, max = Math.max(0.01, ...r.frames.map(f => f.km2));
  const X = k => n === 1 ? W / 2 : 8 + k * (W - 16) / (n - 1), Y = v => H - 18 - v / max * (H - 30);
  const line = r.frames.map((f, k) => `${k ? "L" : "M"}${X(k).toFixed(1)} ${Y(f.km2).toFixed(1)}`).join("");
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Area under water at each step, up to ${max} km²">
    <path d="${line}L${X(n - 1).toFixed(1)} ${H - 18}L${X(0).toFixed(1)} ${H - 18}Z" class="area"/><path d="${line}" class="line"/>
    <circle cx="${X(i).toFixed(1)}" cy="${Y(r.frames[i].km2).toFixed(1)}" r="5" class="dot"/>
    <text x="8" y="${H - 3}" class="tick">${esc(r.kind === "model" ? "Start" : frameWhen(r, 0))}</text><text x="${W - 8}" y="${H - 3}" text-anchor="end" class="tick">${esc(r.kind === "model" ? (n - 1) + " hours" : frameWhen(r, n - 1))}</text>
    <text x="8" y="12" class="tick">${max} km²</text></svg>`;
}

/* ---------- playing ---------- */
async function replayShow(i) {
  const r = replayById(UI.replay.id); if (!r) return;
  UI.replay.i = Math.max(0, Math.min(r.frames.length - 1, i));
  const token = ++RP.token;
  const fc = await loadFrame(r, UI.replay.i).catch(() => null);
  if (token !== RP.token || UI.screen !== "replays") return;   /* a newer step or another screen won */
  mapReplay(fc || {type: "FeatureCollection", features: []}, r.kind);
  const now = $("#rp-now"); if (now) now.innerHTML = frameNow(r, UI.replay.i);
  const sl = $("#rp-slider"); if (sl && +sl.value !== UI.replay.i) sl.value = UI.replay.i;
  const sp = $("#rp-spark"); if (sp) sp.innerHTML = sparkline(r, UI.replay.i);
  loadFrame(r, UI.replay.i + 1).catch(() => {});   /* fetch the next step early */
}
function replayStop() {
  clearInterval(RP.timer); RP.timer = null;
  const b = $("#rp-play"); if (b) { b.textContent = "▶ Play"; b.setAttribute("aria-pressed", "false"); }
}
function replayToggle() {
  if (RP.timer) return replayStop();
  const r = replayById(UI.replay.id); if (!r) return;
  if (UI.replay.i >= r.frames.length - 1) UI.replay.i = 0;
  RP.timer = setInterval(() => {
    if (UI.screen !== "replays" || !replayById(UI.replay.id)) return replayStop();
    const last = replayById(UI.replay.id).frames.length - 1;
    if (UI.replay.i >= last) return replayStop();
    replayShow(UI.replay.i + 1);
  }, 1100);
  const b = $("#rp-play"); if (b) { b.textContent = "❚❚ Pause"; b.setAttribute("aria-pressed", "true"); }
  replayShow(UI.replay.i);
}
function replayMapView() {
  const r = replayById(UI.replay.id);
  const b = r ? r.bbox : ALL_FIT.bounds.flat();
  return {show: "replay", three: false, hot: [], past: [], safe: [], roads: [], dams: [], sel: null, reach: [], fit: {bounds: [[b[0], b[1]], [b[2], b[3]]], maxZoom: 15}};
}

/* ---------- recorded floods year by year ---------- */
const YEARS = {timer: null};
function yearRange() {
  const ys = data("events").concat(data("regionEvents")).map(e => e.year).filter(Boolean).concat(replays().map(replayYear));
  if (!ys.length) return [];
  const lo = Math.max(Math.min(...ys), NOW.getFullYear() - 24), hi = NOW.getFullYear();
  return Array.from({length: hi - lo + 1}, (_, k) => lo + k);
}
function yearSliderHtml() {
  const ys = yearRange(); if (!ys.length) return "";
  const cur = /^\d{4}$/.test(UI.year) ? +UI.year : null;
  const idx = cur ? Math.max(0, ys.indexOf(cur)) : ys.length - 1;
  const sat = cur ? replays().filter(r => r.kind === "satellite" && replayYear(r) === cur) : [];
  return `<div class="card player">
    <div class="player-row">
      <button class="btn primary inline" data-act="years-play" aria-pressed="${!!YEARS.timer}">${YEARS.timer ? "❚❚ Pause" : "▶ Play the years"}</button>
      <input id="year-slider" type="range" min="0" max="${ys.length - 1}" value="${idx}" aria-label="Year">
      <b class="player-year">${cur || "All years"}</b>
    </div>
    <div class="toolbar"><button class="sbtn" data-act="year" data-y="all" aria-pressed="${UI.year === "all"}">All years</button><button class="sbtn" data-act="year" data-y="unknown" aria-pressed="${UI.year === "unknown"}">Year not confirmed</button></div>
    ${sat.length ? `<p class="small">Satellite maps from ${cur}: ${sat.map(r => `<button class="linkbtn" data-act="replay-open" data-id="${esc(r.id)}">${esc(r.title)}</button>`).join(", ")}</p>` : ""}
  </div>`;
}
function yearsStop() { clearInterval(YEARS.timer); YEARS.timer = null; }
function yearsToggle() {
  if (YEARS.timer) { yearsStop(); return render(); }
  const ys = yearRange(); if (!ys.length) return;
  let k = /^\d{4}$/.test(UI.year) ? ys.indexOf(+UI.year) : -1;
  if (k < 0 || k >= ys.length - 1) k = -1;
  const step = () => {
    if (UI.screen !== "map" || UI.show !== "past") return yearsStop();
    k++;
    if (k >= ys.length) { yearsStop(); return render(); }
    UI.year = String(ys[k]); render();
  };
  YEARS.timer = setInterval(step, 1300);
  step();
}
/* the largest satellite outline of the chosen year, drawn under the past-flood markers */
async function yearOverlay() {
  const y = /^\d{4}$/.test(UI.year) ? +UI.year : null;
  const sats = y ? replays().filter(r => r.kind === "satellite" && replayYear(r) === y) : [];
  const fcs = [];
  for (const r of sats) {
    let best = 0; r.frames.forEach((f, k) => { if (f.km2 > r.frames[best].km2) best = k; });
    const fc = await loadFrame(r, best).catch(() => null);
    if (fc) fcs.push(...fc.features);
  }
  if (UI.screen === "map" && UI.show === "past" && String(y) === UI.year) mapReplay({type: "FeatureCollection", features: fcs}, "satellite");
}

/* ---------- admin: Flood replays ---------- */
function adReplays() {
  const list = data("replays").slice().sort((a, b) => String(b.frames[0]?.t).localeCompare(String(a.frames[0]?.t)));
  const sats = list.filter(r => r.kind === "satellite");
  return `<div class="card"><h2>Flood replays</h2>
    <p class="small muted">Replays let people watch a flood grow and shrink. Model runs come from the modelling tools (one file per city and storm). Satellite maps come from Copernicus EMS, Copernicus GFM or UNOSAT flood outlines, one date at a time.</p>
    <div class="toolbar"><label class="sbtn primary" for="rp-import" style="display:inline-flex;align-items:center">Import a replay file</label><input id="rp-import" type="file" accept="application/json,.json" class="sr"></div>
    ${UI.admin.confirm?.k === "rm-replay" ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr><th>Replay</th><th>Kind</th><th>Steps</th><th>From</th><th class="n">Most water (km²)</th><th></th></tr></thead><tbody>
    ${list.map(r => `<tr><td>${esc(r.title)}</td><td>${esc(REPLAY_KINDS[r.kind] || r.kind)}</td><td class="num">${r.frames.length}</td><td class="small">${esc(frameWhen(r, 0))}</td><td class="n">${Math.max(...r.frames.map(f => f.km2))}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="replay-open" data-id="${esc(r.id)}">Watch</button>${canDelete("replays") ? ` <button class="sbtn danger" data-act="ad-ask" data-k="rm-replay" data-id="${esc(r.id)}">Delete</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="6">No replays yet.</td></tr>`}
    </tbody></table></div></div>
  <form class="card" id="ro-form" novalidate><h2>Add a satellite flood outline</h2>
    <p class="small muted">GeoJSON in longitude/latitude (EPSG:4326), for one date. Large outlines are simplified automatically. Keep the original product link so people can check it.</p>
    <div class="formgrid">
      <label class="field wide"><span>GeoJSON file</span><input id="ro-file" type="file" accept=".geojson,.json,application/geo+json,application/json"></label>
      <label class="field"><span>Date the satellite saw the water</span><input id="ro-date" type="date"></label>
      <label class="field"><span>Add to</span><select id="ro-target"><option value="">A new satellite replay</option>${sats.map(r => `<option value="${esc(r.id)}">${esc(r.title)}</option>`).join("")}</select></label>
      <label class="field wide"><span>Title (new replays), e.g. “Borno floods after the Alau Dam collapse, September 2024”</span><input id="ro-title" maxlength="120"></label>
      <label class="field"><span>Short name (new replays): lowercase, numbers, dashes</span><input id="ro-id" maxlength="80" placeholder="borno-2024"></label>
      <label class="field"><span>Country</span><select id="ro-c"><option value="GH">Ghana</option><option value="NG">Nigeria</option></select></label>
      <label class="field wide"><span>Regions or states covered (IDs, comma separated)</span><input id="ro-areas" placeholder="NG-BO"></label>
      <label class="field wide"><span>Source, e.g. “Copernicus EMS EMSR753, Sentinel-1”</span><input id="ro-source" maxlength="200"></label>
      <label class="field wide"><span>Link to the original product</span><input id="ro-link" type="url" maxlength="500" placeholder="https://"></label>
    </div>
    <p class="small" id="ro-err" role="alert" style="color:var(--vhigh)"></p>
    <div class="toolbar"><button class="sbtn primary" type="submit">Add outline</button></div></form>`;
}
async function replayImportFile(file) {
  try { const v = await importReplayFile(file); toast(`Imported “${v.meta.title}” with ${v.frames.length} steps.`); render(); }
  catch (e) { toast(e instanceof SyntaxError ? "That isn't an Open Tracker replay file." : errText(e)); }
}
async function replayOutlineSubmit(form) {
  const err = form.querySelector("#ro-err");
  try { await addOutline(form); toast("Outline added."); render(); }
  catch (e) { if (err) err.textContent = errText(e); }
}

/* ---- features/world.js ---- */
/* ===== Every country and town: the world tables built by world/build_world.py =====
   Two place types join Ghana's and Nigeria's detailed ones:
     {type: "wc", id: "<two-letter code>"}  any country (Ghana and Nigeria keep their detailed "country" pages)
     {type: "wp", id: "p<number>"}          a town: every capital and every place of 50,000 people or more */
const WIX = {places: new Map(), byCountry: new Map()};
(function indexWorld() {
  for (const [id, n, c, a1, lon, lat, pop, cap, rlon, rlat] of WORLD.places) {
    const p = {id: "p" + id, n, c, a1, ll: [lon, lat], pop, cap: !!cap, river: rlon || rlat ? [rlon, rlat] : null};
    WIX.places.set(p.id, p);
    if (!WIX.byCountry.has(c)) WIX.byCountry.set(c, []);
    WIX.byCountry.get(c).push(p);
  }
})();

const worldCountry = cc => WORLD.countries[cc] || null;
const worldPlace = id => WIX.places.get(id) || null;
const DETAILED = new Set(Object.keys(FT.countries));   /* countries with hotspot-level flood data */
/* the page for a country: Ghana and Nigeria open their detailed page, every other country its flood and heat reach */
const countryPlace = cc => (DETAILED.has(cc) ? {type: "country", id: cc} : {type: "wc", id: cc});

function countryName(cc) { return FT.countries[cc]?.n || worldCountry(cc)?.n || cc; }

/* the nearest towns to a point, within maxKm */
function nearestWorldPlaces(ll, maxKm, cc, limit = 1) {
  const list = cc ? WIX.byCountry.get(cc) || [] : [...WIX.places.values()];
  return list.map(p => ({p, d: km(ll, p.ll)})).filter(x => x.d <= maxKm).sort((a, b) => a.d - b.d).slice(0, limit);
}

/* emergency numbers: Ghana's and Nigeria's agency list, otherwise the country's public numbers */
function emergencyNumbers(cc) {
  const listed = data("contacts").filter(x => x.c === cc);
  if (listed.length) return listed.map(x => ({n: x.n, num: x.num}));
  return (worldCountry(cc)?.e || []).map((num, i) => ({n: i === 0 ? "Emergency" : "Also", num}));
}

/* search entries for every country and town (added to Ghana's and Nigeria's detailed ones) */
function worldSearchEntries() {
  const out = [];
  for (const [cc, c] of Object.entries(WORLD.countries)) {
    if (DETAILED.has(cc)) continue;
    out.push({p: {type: "wc", id: cc}, t: c.n, s: "Country · flood and heat reach", keys: [c.n, cc.toLowerCase()]});
  }
  for (const p of WIX.places.values()) out.push({p: {type: "wp", id: p.id}, t: p.n, s: `${p.a1 ? p.a1 + ", " : ""}${countryName(p.c)}`, keys: [p.n]});
  return out;
}

/* ---- features/hazards.js ---- */
/* ===== Live flood and heat data for every country =====
   The data feeds (webapp/lib/feeds) build one summary per country: heat for the next 7 days at each town, river
   flow, official warnings (CAP), current disasters (GDACS) and satellite scenes. The web app reads them from its
   server; the claude.ai page reads a snapshot an administrator imports (Admin → Live data).
   This module loads them on demand and turns them into the projected reach of heat and floods. */
const HZ = {docs: new Map(), pending: new Set(), stale: new Set()};

const HEAT_LEVELS = [
  {k: 0, n: "Normal", word: "Normal heat"},
  {k: 1, n: "Hot", word: "Hot"},
  {k: 2, n: "Heatwave", word: "Heatwave"},
  {k: 3, n: "Dangerous heat", word: "Dangerous heat"},
  {k: 4, n: "Extreme danger", word: "Extreme heat danger"}
];
const HEAT_ADVICE = [
  ["Drink water through the day.", "Check Open Tracker again when hot weather is forecast."],
  ["Drink water often, even before you feel thirsty.", "Stay in shade between late morning and late afternoon.", "Never leave children or animals in a parked car."],
  ["Drink water often and eat light meals.", "Stay out of the sun from 11 am to 4 pm; rest in the coolest room.", "Check every day on older people, babies, pregnant women and anyone unwell.", "Wear light, loose clothes and a hat outdoors."],
  ["Avoid hard work or sport outdoors; do it early in the morning if you must.", "Cool down with water on your skin and moving air.", "Check on older people, babies and anyone unwell twice a day.", "Know the signs of heatstroke: hot dry skin, confusion, fainting. Call the emergency number at once."],
  ["Stay in the coolest place you can reach for the hottest hours; go to a cooled public place if home is too hot.", "Do no hard work outdoors.", "Keep everyone drinking water; wet skin and fan it to cool down.", "Heatstroke is an emergency: call the emergency number below and cool the person while you wait."]
];
const FLOOD_WORDS = {warning: "Flood warning signs", watch: "Flood watch signs", none: "No flood signs"};

/* ---------- loading ---------- */
async function loadHazards(key) {
  if (window.WEBAPP) return window.WEBAPP.hazards(key);
  if (DB.api) { const s = await DB.api.collection("hazards").doc(key).get(); return s.exists ? s.data() : null; }
  return null;
}
/* the summary for a country code or "world": the document, null when there is none, undefined while loading.
   A stale summary is shown while its fresh copy loads. */
function hazardsDoc(key) {
  const have = HZ.docs.has(key);
  if ((!have || HZ.stale.has(key)) && !HZ.pending.has(key)) {
    HZ.pending.add(key);
    loadHazards(key).then(doc => validHazards(doc, key), () => (have ? HZ.docs.get(key) : null)).then(doc => {
      const changed = !have || JSON.stringify(doc) !== JSON.stringify(HZ.docs.get(key));
      HZ.docs.set(key, doc); HZ.pending.delete(key); HZ.stale.delete(key);
      if (changed) afterData();
    });
  }
  return have ? HZ.docs.get(key) : undefined;
}
function hazardsForget() { for (const k of HZ.docs.keys()) HZ.stale.add(k); }

/* only well-formed summaries are used; every text in them is escaped when shown */
function validHazards(doc, key) {
  if (!doc || typeof doc !== "object") return null;
  if (key === "world") return doc.countries && typeof doc.countries === "object" ? doc : null;
  const list = v => (Array.isArray(v) ? v : []);
  const pt = ll => Array.isArray(ll) && ll.length === 2 && ll.every(Number.isFinite);
  return {c: key, updated: typeof doc.updated === "string" ? doc.updated : null,
    heat: list(doc.heat).filter(h => h && pt(h.ll) && Array.isArray(h.days)),
    rivers: list(doc.rivers).filter(r => r && pt(r.ll)),
    alerts: list(doc.alerts).filter(a => a && typeof a.id === "string"),
    disasters: list(doc.disasters).filter(e => e && typeof e.id === "string"),
    scenes: doc.scenes && typeof doc.scenes === "object" ? doc.scenes : {},
    sources: list(doc.sources).filter(s => typeof s === "string")};
}

/* ---------- reading the summaries ---------- */
const num = v => (typeof v === "number" && Number.isFinite(v) ? v : null);

/* the heat record of the town nearest to a point (within maxKm) */
function heatNear(doc, ll, maxKm = 75) {
  if (!doc) return null;
  let best = null;
  for (const h of doc.heat) { const d = km(ll, h.ll); if (d <= maxKm && (!best || d < best.d)) best = {h, d}; }
  return best;
}

/* rain expected over the next 3 days at a heat record */
const rain3 = h => h.days.slice(0, 3).reduce((s, d) => s + (num(d.rain) || 0), 0);

function pointInRing(ll, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > ll[1]) !== (yj > ll[1]) && ll[0] < (xj - xi) * (ll[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function alertCovers(a, ll) {
  const areas = Array.isArray(a.areas) ? a.areas : [];
  const shaped = areas.some(ar => (ar.polygons || []).length || (ar.circles || []).length);
  if (!shaped) return true;   /* no shape: the warning covers the issuing country */
  return areas.some(ar => (ar.polygons || []).some(r => pointInRing(ll, r)) || (ar.circles || []).some(c => km(ll, c.ll) <= c.km));
}

/* Everything that says a flood may reach this country (or this point): each sign has a level, a place, how far
   it reaches (km) and a plain sentence. Official warnings come first. */
function floodSigns(doc, ll = null, radiusKm = 60) {
  if (!doc) return [];
  const out = [];
  const near = p => !ll || (p && km(ll, p) <= radiusKm);
  for (const a of doc.alerts.filter(x => x.hazard === "flood")) {
    if (ll && !alertCovers(a, ll)) continue;
    out.push({kind: "official", level: ["Extreme", "Severe"].includes(a.severity) ? "warning" : "watch", text: `${a.event || "Flood warning"} from ${a.agency}${a.headline ? ": " + a.headline : ""}`, alert: a});
  }
  for (const e of doc.disasters.filter(x => (x.type === "FL" || x.type === "TC") && x.current)) {
    if (ll && !(near(e.ll) || (e.bbox && ll[0] >= e.bbox[0] && ll[0] <= e.bbox[2] && ll[1] >= e.bbox[1] && ll[1] <= e.bbox[3]))) continue;
    out.push({kind: "disaster", level: e.level === "Green" ? "watch" : "warning", ll: e.ll, km: 40, bbox: e.bbox, text: `${e.title} (GDACS ${e.level.toLowerCase()} alert)`, event: e});
  }
  for (const r of doc.rivers) {
    if (!near(r.ll) || !["rising fast", "rising"].includes(r.trend)) continue;
    const ratio = num(r.today) && num(r.peak7) ? r.peak7 / r.today : null;
    out.push({kind: "river", level: r.trend === "rising fast" ? "warning" : "watch", ll: r.river || r.ll, km: r.trend === "rising fast" ? 25 : 15,
      text: `River near ${r.n} ${r.trend}${ratio ? `: flow up to ${ratio.toFixed(1)} times today's within a week` : ""}`});
  }
  for (const h of doc.heat) {
    const mm = rain3(h);
    if (mm < 50 || !near(h.ll)) continue;
    out.push({kind: "rain", level: mm >= 100 ? "warning" : "watch", ll: h.ll, km: mm >= 100 ? 25 : 15, mm, text: `${Math.round(mm)} mm of rain expected in ${h.n} over 3 days`});
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "warning" ? -1 : 1) || (a.kind === "official" ? -1 : b.kind === "official" ? 1 : 0));
}
const floodLevel = signs => (signs.some(s => s.level === "warning") ? "warning" : signs.length ? "watch" : "none");

/* how far the heat reaches on one forecast day: towns at heatwave level or worse, and the people living in them */
function heatReach(doc, day = 0) {
  if (!doc) return {towns: [], people: 0, worst: 0};
  const towns = doc.heat.map(h => ({h, d: h.days[day]})).filter(x => x.d && x.d.level >= 2).sort((a, b) => b.d.level - a.d.level || b.h.pop - a.h.pop);
  return {towns, people: towns.reduce((s, x) => s + (x.h.pop || 0), 0), worst: towns.length ? towns[0].d.level : Math.max(0, ...doc.heat.map(h => h.days[day]?.level || 0))};
}
/* How far a town's forecast heat reaches on the map. Heatwaves cover whole regions and the forecast models' cells are
   9–25 km wide, so a town's reading stands for its surroundings: wider for worse heat and for bigger towns (35 to 110 km). */
const heatReachKm = (level, pop) => Math.max(35, Math.min(110, 25 + 15 * level + 4 * Math.log10(Math.max(1e4, pop || 0) / 1e4)));

/* ---------- words and numbers ---------- */
const heatChip = lv => `<span class="chip heat-${lv}">${esc(HEAT_LEVELS[lv]?.n || "No data")}</span>`;
const floodChip = lv => `<span class="chip flood-${lv}">${esc(FLOOD_WORDS[lv])}</span>`;
const signChip = lv => `<span class="chip flood-${lv}">${lv === "warning" ? "Warning" : "Watch"}</span>`;
function fmtPeople(n) { return n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)} million` : n >= 1e3 ? `${Math.round(n / 1e3)} thousand` : String(n); }
function fmtVolume(m3) {
  if (m3 >= 1e9) return `${(m3 / 1e9).toFixed(1)} billion m³`;
  if (m3 >= 1e6) return `${(m3 / 1e6).toFixed(1)} million m³`;
  if (m3 >= 1e3) return `${Math.round(m3 / 1e3)} thousand m³`;
  return `${Math.round(m3)} m³`;
}
function fmtArea(km2) { return km2 <= 0 ? "0 km²" : km2 < 0.01 ? "under 0.01 km²" : `${km2.toFixed(2)} km²`; }
const pools = m3 => Math.round(m3 / 2500);   /* an Olympic pool holds about 2,500 m³ */
function depthWords(m) {
  if (m < FLOODSIM.WET) return "dry or a thin film of water";
  return FLOODSIM.CLASSES.slice().reverse().find(c => m >= c.min).n.toLowerCase();
}
/* "today", "tomorrow" or "on Sat, 31 Oct", to follow a word in a sentence or heading */
const dayPhrase = (iso, i) => (i < 2 ? dayName(iso, i).toLowerCase() : "on " + dayName(iso, i));
function dayName(iso, i) {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  const d = new Date(iso + "T12:00:00Z");
  return isNaN(d) ? iso : d.toLocaleDateString("en-GB", {weekday: "short", day: "numeric", month: "short"});
}
function hazardsUpdated(doc) { return doc && doc.updated ? `Updated ${fmtDate(doc.updated)}` : ""; }

/* ---------- claude.ai page: importing the live data the web app's feeds gathered (Admin → Live data) ---------- */
const SNAPSHOT_MAX_DOC = 900 * 1024;   /* bytes per country record in the shared database */
async function importSnapshot(file) {
  REPO.require(AUTH.can("data.edit") && !APPROVAL.gate(), "import live data");
  if (file.size > 60e6) throw new Error("That file is too large (60 MB at most).");
  let snap;
  try { snap = JSON.parse(await file.text()); } catch (e) { throw new Error("That isn't an Open Tracker live data file."); }
  if (!snap || snap.app !== "OpenTracker-snapshot" || snap.version !== 1 || !snap.countries || typeof snap.countries !== "object") throw new Error("That isn't an Open Tracker live data file.");
  const world = validHazards(snap.world, "world");
  if (!world) throw new Error("The file has no world summary.");
  const docs = [];
  for (const [cc, raw] of Object.entries(snap.countries)) {
    if (!/^[A-Z]{2}$/.test(cc) || !worldCountry(cc)) continue;
    const doc = validHazards(raw, cc);
    if (!doc) continue;
    if (JSON.stringify(doc).length > SNAPSHOT_MAX_DOC) throw new Error(`${countryName(cc)}'s data is too large for the shared database; lower FEED_PLACES on the web app.`);
    docs.push([cc, doc]);
  }
  for (const [cc, doc] of docs) await DB.api.collection("hazards").doc(cc).set(doc);
  await DB.api.collection("hazards").doc("world").set(world);   /* last: the world map points at the countries */
  await REPO.audit("imported live data", "hazards", "snapshot", null, {countries: docs.length, gathered: String(snap.at || "").slice(0, 40)});
  hazardsForget();
  return {countries: docs.length, at: snap.at};
}

/* ---- features/floodsim.js ---- */
/* ===== Flood projection: how far water reaches, how deep it gets and how much water there is =====
   A small two-dimensional flood model run on the real ground heights around a place. Rain falls on every cell
   (minus what soaks in), rivers rise at river cells, the sea holds coastal cells at sea level, and water flows
   downhill between neighbouring cells with Manning friction: the diffusive-wave scheme of LISFLOOD-FP
   (Bates and De Roo 2000), with each transfer capped so depths never go negative.
   Pure functions: no page, no network. The projection screen drives it in short slices so the page stays smooth;
   tests check that every cubic metre of water is accounted for. */
const FLOODSIM = (() => {
  const G = 9.81;
  const MIN_FLOW_DEPTH = 1e-4;          /* m: thinner films do not flow */
  const EDGE_SLOPE = 0.002;             /* water leaving the grid's edge flows out on a gentle slope */
  const CLASSES = [                     /* the same words as the city flood models (modelling/frames.py) */
    {k: 1, min: 0.15, max: 0.3, n: "Ankle to knee deep"},
    {k: 2, min: 0.3, max: 0.6, n: "Knee to waist deep"},
    {k: 3, min: 0.6, max: 1.2, n: "Waist to chest deep"},
    {k: 4, min: 1.2, max: null, n: "Deeper than chest height"}
  ];
  const WET = CLASSES[0].min;           /* a cell counts as flooded from ankle depth */

  /* cells below sea level that touch the grid's edge through other low cells: the open sea */
  function seaMask(z, w, h, seaLevel) {
    const sea = new Uint8Array(w * h);
    if (seaLevel === null || seaLevel === undefined) return sea;
    const stack = [];
    const push = i => { if (!sea[i] && z[i] < seaLevel) { sea[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % w;
      if (x > 0) push(i - 1);
      if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w);
      if (i < (h - 1) * w) push(i + w);
    }
    return sea;
  }

  /* rain rate (m/s) at time t (s) for a storm of totalMm over stormHours, peaking in the middle (triangle) */
  function rainRate(totalMm, stormHours, t) {
    const T = stormHours * 3600;
    if (!(totalMm > 0) || !(T > 0) || t < 0 || t > T) return 0;
    const peak = 2 * totalMm / 1000 / T;
    return peak * (1 - Math.abs(t - T / 2) / (T / 2));
  }

  function classify(depth) {
    const out = new Uint8Array(depth.length);
    for (let i = 0; i < depth.length; i++) {
      const d = depth[i];
      out[i] = d >= 1.2 ? 4 : d >= 0.6 ? 3 : d >= 0.3 ? 2 : d >= WET ? 1 : 0;
    }
    return out;
  }

  /* totals for one moment, over the land cells (sea and river cells are boundaries, not flooding) */
  function stats(d, fixed, area) {
    let volume = 0, wet = 0, maxDepth = 0;
    const byClass = [0, 0, 0, 0, 0];
    for (let i = 0; i < d.length; i++) {
      if (fixed[i]) continue;
      const v = d[i];
      if (v <= 0) continue;
      volume += v * area;
      if (v > maxDepth) maxDepth = v;
      if (v >= WET) { wet++; byClass[v >= 1.2 ? 4 : v >= 0.6 ? 3 : v >= 0.3 ? 2 : 1]++; }
    }
    return {volume, km2: wet * area / 1e6, maxDepth, byClass: byClass.map(n => n * area / 1e6)};
  }

  /* A run that advances in slices: step(seconds of model time) → true when finished.
     opts: {dem, w, h, cell (m), rainMm, stormHours, hours, runoff (0–1), manning,
            seaLevel (m, or null inland: ground below it and joined to the edge is the sea), surge (m above seaLevel),
            river: [cell indices], riverRise (m), frameEvery (s), maxDt (s)}.
     The sea and rivers rise to their full height over the storm hours and push water onto the land. */
  function create(opts) {
    const w = opts.w, h = opts.h, n = w * h, cell = opts.cell, A = cell * cell;
    if (!(w >= 3 && h >= 3) || opts.dem.length !== n || !(cell > 0)) throw new Error("bad grid");
    const z = Float64Array.from(opts.dem);
    const manning = opts.manning || 0.05, runoff = Math.min(1, Math.max(0, opts.runoff ?? 0.6));
    const end = Math.max(1, opts.hours || 12) * 3600, frameEvery = opts.frameEvery || 3600, maxDt = opts.maxDt || 30;
    const stormHours = opts.stormHours || 6, rainMm = opts.rainMm || 0, riverRise = Math.max(0, opts.riverRise || 0), surge = Math.max(0, opts.surge || 0);
    const fixed = seaMask(z, w, h, opts.seaLevel);                 /* 1 = sea */
    const river = (opts.river || []).filter(i => i >= 0 && i < n && !fixed[i]);
    river.forEach(i => { fixed[i] = 2; });                          /* 2 = river held at its stage */
    const d = new Float64Array(n), delta = new Float64Array(n);
    const sea = opts.seaLevel ?? 0;
    for (let i = 0; i < n; i++) if (fixed[i] === 1) d[i] = Math.max(0, sea - z[i]);
    const ledger = {rain: 0, river: 0, edge: 0, sea: 0};
    const frames = [];
    let t = 0, nextFrame = frameEvery;

    const rise = time => Math.min(1, time / (stormHours * 3600));   /* rivers and sea come up over the storm */
    const snap = () => { const s = stats(d, fixed, A); frames.push(Object.assign({t, depth: Float32Array.from(d)}, s)); };
    const bounds = [], edges = [];
    for (let i = 0; i < n; i++) if (fixed[i]) bounds.push(i);
    for (let x = 0; x < w; x++) edges.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) edges.push(y * w, y * w + w - 1);   /* corners appear twice: two open sides */
    const edgeQ = Math.sqrt(EDGE_SLOPE) / manning;
    let hmax = 0.01;
    snap();

    /* Sea and river cells go back to their (rising) level after each step. What flowed between them and the
       land during the step is counted; their own rise is the sea's or river's water, not flooding. */
    const held = new Float64Array(bounds.length);
    bounds.forEach((i, k) => { held[k] = d[i]; });
    function holdBoundaries() {
      bounds.forEach((i, k) => {
        const flowedIn = (d[i] - held[k]) * A;
        if (fixed[i] === 1) ledger.sea += flowedIn; else ledger.river -= flowedIn;
        held[k] = d[i] = fixed[i] === 1 ? Math.max(0, sea + surge * rise(t) - z[i]) : riverRise * rise(t);
      });
    }

    /* volume moved across the face between cells a and b in dt seconds (positive: a → b) */
    function faceFlow(a, b, dt) {
      const da = d[a], db = d[b];
      if (da <= MIN_FLOW_DEPTH && db <= MIN_FLOW_DEPTH) return 0;
      const za = z[a], zb = z[b], dEta = za + da - zb - db;
      if (dEta === 0) return 0;
      const hf = (dEta > 0 ? za + da : zb + db) - (za > zb ? za : zb);
      if (hf <= MIN_FLOW_DEPTH) return 0;
      const s = dEta > 0 ? dEta : -dEta, donor = dEta > 0 ? da : db;
      let q = hf * Math.cbrt(hf * hf) / manning * Math.sqrt(s / cell);
      const qc = hf * Math.sqrt(G * hf);
      if (q > qc) q = qc;
      let vol = q * cell * dt;
      if (vol > s * A / 4) vol = s * A / 4;
      if (vol > donor * A / 4) vol = donor * A / 4;
      return dEta > 0 ? vol : -vol;
    }

    function stepOnce(limit) {
      const dt = Math.min(maxDt, 0.7 * cell / Math.sqrt(G * hmax), limit);
      const rain = rainRate(rainMm, stormHours, t + dt / 2) * runoff * dt;
      delta.fill(0);
      for (let y = 0; y < h; y++) {
        const row = y * w;
        for (let i = row; i < row + w - 1; i++) { const v = faceFlow(i, i + 1, dt); if (v !== 0) { delta[i] -= v; delta[i + 1] += v; } }
        if (y < h - 1) for (let i = row; i < row + w; i++) { const v = faceFlow(i, i + w, dt); if (v !== 0) { delta[i] -= v; delta[i + w] += v; } }
      }
      /* free outfall at the grid's edge (one open side per edge, two at corners) */
      for (const i of edges) {
        if (fixed[i] || d[i] <= MIN_FLOW_DEPTH) continue;
        let vol = d[i] * Math.cbrt(d[i] * d[i]) * edgeQ * cell * dt;
        if (vol > d[i] * A / 4) vol = d[i] * A / 4;
        delta[i] -= vol; ledger.edge += vol;
      }
      hmax = 0.01;
      let rained = 0;
      for (let i = 0; i < n; i++) {
        let v = d[i] + delta[i] / A;
        if (!fixed[i] && rain > 0) { v += rain; rained++; }
        d[i] = v > 0 ? v : 0;
        if (d[i] > hmax) hmax = d[i];
      }
      ledger.rain += rained * rain * A;
      t += dt;
      holdBoundaries();
    }

    return {
      w, h, cell, fixed, frames, ledger,
      get time() { return t; },
      get done() { return t >= end - 1e-6; },
      /* advance up to `seconds` of model time; returns true when the run is finished */
      step(seconds) {
        const stop = Math.min(end, t + seconds);
        while (t < stop - 1e-6) {
          stepOnce(Math.min(nextFrame, stop) - t);
          if (t >= nextFrame - 1e-6) { snap(); nextFrame += frameEvery; }
        }
        return t >= end - 1e-6;
      },
      /* water on the land now, and what came in and went out: rain + river = stored + edge + sea
         (sea is negative when a storm surge pushes the sea onto the land) */
      balance() {
        let stored = 0;
        for (let i = 0; i < n; i++) if (!fixed[i]) stored += d[i] * A;
        return {stored, rain: ledger.rain, river: ledger.river, edge: ledger.edge, sea: ledger.sea};
      }
    };
  }

  function runAll(opts) { const r = create(opts); while (!r.step(3600)); return r; }

  /* the highest water of the run at each cell, and when it came */
  function peak(frames) {
    const n = frames[0].depth.length, depth = new Float32Array(n), hour = new Uint8Array(n);
    frames.forEach((f, k) => { for (let i = 0; i < n; i++) if (f.depth[i] > depth[i]) { depth[i] = f.depth[i]; hour[i] = k; } });
    return {depth, hour};
  }

  /* cells of one depth class → rectangles (lon/lat) merged along rows and down columns: a MultiPolygon */
  function classPolygons(classes, w, h, bbox, k, stride = 1) {
    const [W, S, E, N] = bbox, gw = Math.ceil(w / stride), gh = Math.ceil(h / stride);
    const at = (gx, gy) => classes[Math.min(h - 1, gy * stride) * w + Math.min(w - 1, gx * stride)] === k;
    const lon = gx => W + (E - W) * Math.min(gw, gx) / gw, lat = gy => N - (N - S) * Math.min(gh, gy) / gh;
    const open = new Map(), rects = [];
    for (let gy = 0; gy < gh; gy++) {
      const runs = [];
      for (let gx = 0; gx < gw;) {
        if (!at(gx, gy)) { gx++; continue; }
        const x0 = gx;
        while (gx < gw && at(gx, gy)) gx++;
        runs.push(x0 + ":" + gx);
      }
      const next = new Map();
      for (const key of runs) next.set(key, open.has(key) ? open.get(key) : {key, y0: gy});
      for (const [key, r] of open) if (!next.has(key)) rects.push(Object.assign(r, {y1: gy}));
      open.clear(); next.forEach((v, key) => open.set(key, v));
    }
    for (const r of open.values()) rects.push(Object.assign(r, {y1: gh}));
    return rects.map(r => {
      const [x0, x1] = r.key.split(":").map(Number);
      const a = [lon(x0), lat(r.y0)], b = [lon(x1), lat(r.y0)], c = [lon(x1), lat(r.y1)], d = [lon(x0), lat(r.y1)];
      return [[a, d, c, b, a].map(p => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5])];
    });
  }

  /* one step of a replay file: a FeatureCollection with one MultiPolygon per depth class, kept under the
     size limits phones and the database use (coarser cells when the water is very patchy) */
  function frameCollection(classes, w, h, bbox, {maxBytes = 180000, maxPoints = 40000} = {}) {
    for (let stride = 1; stride <= 8; stride++) {
      const features = [];
      let points = 0;
      for (const c of CLASSES) {
        const polys = classPolygons(classes, w, h, bbox, c.k, stride);
        if (!polys.length) continue;
        points += polys.length * 5;
        features.push({type: "Feature", properties: {k: c.k}, geometry: {type: "MultiPolygon", coordinates: polys}});
      }
      const fc = {type: "FeatureCollection", features};
      if (points <= maxPoints && JSON.stringify(fc).length <= maxBytes) return fc;
    }
    throw new Error("The flooded area is too patchy to save; try a smaller area.");
  }

  return {CLASSES, WET, seaMask, rainRate, classify, stats, create, runAll, peak, classPolygons, frameCollection};
})();

/* ---- features/terrain.js ---- */
/* ===== Ground heights for flood projections =====
   Terrarium elevation tiles (AWS Terrain Tiles: SRTM, Copernicus/EU-DEM, 3DEP and others; heights in metres coded
   in the red, green and blue of each pixel). Read in the public web app only: claude.ai pages cannot load data
   from other sites. Zoom 13 gives about 19 m pixels at the equator, resampled to the model's grid. */
const TERRAIN = (() => {
  const Z = 13, SIZE = 256, KEEP = 64;
  const cache = new Map();   /* "x/y" -> Promise<Float32Array> */

  /* fractional tile coordinates of a point at zoom z (Web Mercator) */
  function tileXY(lon, lat, z) {
    const n = 2 ** z, r = lat * Math.PI / 180;
    return [(lon + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n];
  }
  const decode = (r, g, b) => r * 256 + g + b / 256 - 32768;

  async function pixels(blob) {
    const img = await createImageBitmap(blob);
    const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(SIZE, SIZE) : Object.assign(document.createElement("canvas"), {width: SIZE, height: SIZE});
    const g = canvas.getContext("2d", {willReadFrequently: true});
    g.drawImage(img, 0, 0, SIZE, SIZE);
    return g.getImageData(0, 0, SIZE, SIZE).data;
  }
  function tile(tmpl, x, y) {
    const n = 2 ** Z, key = `${((x % n) + n) % n}/${y}`;
    if (!cache.has(key)) {
      const url = tmpl.replace("{z}", Z).replace("{x}", ((x % n) + n) % n).replace("{y}", y);
      const p = fetch(url, {mode: "cors", credentials: "omit"}).then(async r => {
        if (!r.ok) throw new Error(`ground-height tile answered ${r.status}`);
        const px = await pixels(await r.blob()), out = new Float32Array(SIZE * SIZE);
        for (let i = 0; i < out.length; i++) out[i] = decode(px[4 * i], px[4 * i + 1], px[4 * i + 2]);
        return out;
      });
      p.catch(() => cache.delete(key));
      cache.set(key, p);
      if (cache.size > KEEP) cache.delete(cache.keys().next().value);
    }
    return cache.get(key);
  }

  /* A square grid of ground heights around a point: halfKm each way, cells of about cellM metres.
     Returns {dem, w, h, cell, bbox: [west, south, east, north], index(ll)}. */
  async function grid(tmpl, center, halfKm, cellM) {
    const [lon, lat] = center;
    const dLat = halfKm / 110.574, dLon = halfKm / (111.32 * Math.cos(lat * Math.PI / 180));
    const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
    const n = Math.max(20, Math.round(2 * halfKm * 1000 / cellM));
    const [fx0, fy0] = tileXY(bbox[0], bbox[3], Z), [fx1, fy1] = tileXY(bbox[2], bbox[1], Z);
    const tiles = new Map();
    const jobs = [];
    for (let ty = Math.floor(fy0); ty <= Math.floor(fy1); ty++) for (let tx = Math.floor(fx0); tx <= Math.floor(fx1); tx++) {
      jobs.push(tile(tmpl, tx, ty).then(t => tiles.set(`${tx}/${ty}`, t)));
    }
    if (jobs.length > 25) throw new Error("That area is too large.");
    await Promise.all(jobs);
    const at = (px, py) => {   /* one pixel by global pixel coordinates */
      const tx = Math.floor(px / SIZE), ty = Math.floor(py / SIZE);
      const t = tiles.get(`${tx}/${ty}`);
      return t ? t[(py - ty * SIZE) * SIZE + (px - tx * SIZE)] : 0;
    };
    const dem = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      const la = bbox[3] - (j + 0.5) * (bbox[3] - bbox[1]) / n;
      for (let i = 0; i < n; i++) {
        const lo = bbox[0] + (i + 0.5) * (bbox[2] - bbox[0]) / n;
        const [tx, ty] = tileXY(lo, la, Z);
        const px = tx * SIZE - 0.5, py = ty * SIZE - 0.5, x0 = Math.floor(px), y0 = Math.floor(py), ax = px - x0, ay = py - y0;
        dem[j * n + i] = (at(x0, y0) * (1 - ax) + at(x0 + 1, y0) * ax) * (1 - ay) + (at(x0, y0 + 1) * (1 - ax) + at(x0 + 1, y0 + 1) * ax) * ay;
      }
    }
    const index = ll => {
      const i = Math.floor((ll[0] - bbox[0]) / (bbox[2] - bbox[0]) * n), j = Math.floor((bbox[3] - ll[1]) / (bbox[3] - bbox[1]) * n);
      return i >= 0 && i < n && j >= 0 && j < n ? j * n + i : -1;
    };
    return {dem, w: n, h: n, cell: 2 * halfKm * 1000 / n, bbox, index};
  }

  /* river cells from map lines ([[lon, lat], …] lists): every grid cell each line passes through */
  function lineCells(g, lines) {
    const out = new Set(), [W, S, E, N] = g.bbox;
    const toGrid = ([lo, la]) => [(lo - W) / (E - W) * g.w, (N - la) / (N - S) * g.h];
    for (const line of lines) {
      for (let k = 1; k < line.length; k++) {
        const [x0, y0] = toGrid(line[k - 1]), [x1, y1] = toGrid(line[k]);
        const steps = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) + 1;
        for (let s = 0; s <= steps; s++) {
          const x = Math.floor(x0 + (x1 - x0) * s / steps), y = Math.floor(y0 + (y1 - y0) * s / steps);
          if (x >= 0 && x < g.w && y >= 0 && y < g.h) out.add(y * g.w + x);
        }
      }
    }
    return [...out];
  }

  return {grid, lineCells, tileXY, decode};
})();

/* ---- features/projection.js ---- */
/* ===== Projected flood for any town: where water would reach, how deep, how much =====
   Fetches the ground heights around the place (features/terrain.js), runs the flood model (features/floodsim.js)
   for a chosen storm, river rise or sea surge, then shows the water hour by hour on the 3D map with buildings.
   Runs in the public web app, where outside map data can load. */
const PROJ = {key: "", sc: "heavy", area: "town", status: "idle", progress: 0, error: "", result: null, hour: 0, timer: null, token: 0};
const PROJ_AREAS = {
  town: {halfKm: 3, cell: 40, n: "6 × 6 km"},
  wide: {halfKm: 5, cell: 60, n: "10 × 10 km"}
};

/* what the projection is for: a recorded flood area or a town */
function projectionTarget(p) {
  if (!p) return null;
  if (p.type === "hotspot") { const h = IX.byId[p.id]; return h ? {key: "hotspot:" + h.id, n: h.n, ll: h.ll, c: h.c, river: null} : null; }
  if (p.type === "wp") { const w = worldPlace(p.id); return w ? {key: "wp:" + w.id, n: w.n, ll: w.ll, c: w.c, river: w.river} : null; }
  return null;
}
const projectionAvailable = () => !!(mapCfg() && mapCfg().terrain);

/* rough river rise from the forecast flow: depth in a wide channel grows with flow to the power 0.6 */
function riverRiseFrom(rec) {
  if (!rec || !(rec.today > 0) || !(rec.peak7 > 0)) return 2;
  return Math.round(Math.min(4, Math.max(0.5, 3 * (Math.pow(rec.peak7 / rec.today, 0.6) - 1))) * 10) / 10;
}
function projectionScenarios(t, doc) {
  const list = [];
  const near = heatNear(doc, t.ll, 40);
  const mm = near ? Math.round(rain3(near.h)) : 0;
  if (mm >= 5) list.push({id: "forecast", n: `Forecast rain: ${mm} mm`, desc: `The rain forecast for the next 3 days near ${near.h.n}, falling within 12 hours`, rainMm: mm, stormHours: 12, hours: 18});
  list.push({id: "heavy", n: "Heavy storm: 100 mm", desc: "100 mm of rain in 6 hours, a storm many tropical cities see most years", rainMm: 100, stormHours: 6, hours: 12});
  list.push({id: "extreme", n: "Extreme storm: 200 mm", desc: "200 mm of rain in 12 hours, like Accra on 29 June 2026 (169 mm in a day)", rainMm: 200, stormHours: 12, hours: 18});
  const rec = doc ? doc.rivers.find(r => km(r.ll, t.ll) < 10) : null;
  if (t.river || rec) {
    const rise = riverRiseFrom(rec);
    list.push({id: "river", n: `River rises ${rise} m`, desc: rec ? `From the GloFAS river forecast (flow ${rec.trend}), with 50 mm of rain` : "A large river flood, with 50 mm of rain", rainMm: 50, stormHours: 6, hours: 12, riverRise: rise});
  }
  list.push({id: "surge", n: "Sea surge: 1 m", desc: "The sea 1 metre above normal with 100 mm of rain, as in a tropical storm (coasts only)", rainMm: 100, stormHours: 6, hours: 12, surge: 1});
  return list;
}

/* ---------- running ---------- */
async function runProjection(p) {
  const t = projectionTarget(p);
  if (!t || !projectionAvailable()) return;
  const doc = hazardsDoc(t.c) || null;
  const sc = projectionScenarios(t, doc).find(s => s.id === PROJ.sc) || projectionScenarios(t, doc)[0];
  const area = PROJ_AREAS[PROJ.area];
  const token = ++PROJ.token;
  projStop();
  Object.assign(PROJ, {key: t.key, status: "loading", progress: 0, error: "", result: null, hour: 0});
  mapProjection(null);
  render();
  try {
    const g = await TERRAIN.grid(mapCfg().terrain, t.ll, area.halfKm, area.cell);
    if (token !== PROJ.token) return;
    let river = TERRAIN.lineCells(g, mapWaterways(g.bbox));
    if (!river.length && t.river) { const c = g.index(t.river); if (c >= 0) river = [c - 1, c, c + 1, c - g.w, c + g.w].filter(i => i >= 0 && i < g.w * g.h); }
    const sea = FLOODSIM.seaMask(g.dem, g.w, g.h, 0).some(Boolean);
    if (sc.surge && !sea) throw new Error("This area does not reach the sea, so a sea surge cannot reach it. Choose another storm.");
    if (sc.riverRise && !river.length) throw new Error("No river was found in this area on the map. Choose another storm.");
    const run = FLOODSIM.create({dem: g.dem, w: g.w, h: g.h, cell: g.cell, rainMm: sc.rainMm, stormHours: sc.stormHours, hours: sc.hours,
      runoff: 0.6, manning: 0.05, seaLevel: sea ? 0 : null, surge: sc.surge || 0, river: sc.riverRise ? river : [], riverRise: sc.riverRise || 0});
    PROJ.status = "running"; render();
    while (!run.step(1800)) {
      if (token !== PROJ.token) return;
      PROJ.progress = run.time / (sc.hours * 3600);
      const bar = $("#proj-bar"); if (bar) bar.style.width = Math.round(PROJ.progress * 100) + "%";
      await new Promise(r => setTimeout(r, 0));   /* let the page breathe between slices */
    }
    if (token !== PROJ.token) return;
    const frames = run.frames;
    let peakAt = 0;
    frames.forEach((f, k) => { if (f.volume > frames[peakAt].volume) peakAt = k; });
    const mine = window.WEBAPP?.location?.();
    const here = mine && g.index(mine) >= 0 ? {ll: mine, n: "your saved location"} : {ll: t.ll, n: `the centre of ${t.n}`};
    PROJ.result = {t, sc, area, g, frames, peak: FLOODSIM.peak(frames), peakAt, balance: run.balance(), here, hereIdx: g.index(here.ll),
      fixed: run.fixed, made: new Date().toISOString(), buildings: null, sea, rivers: river.length};
    Object.assign(PROJ, {status: "done", hour: peakAt});
    render();
    PROJ.result.buildings = countFloodedBuildings(PROJ.result);
    const b = $("#proj-buildings"); if (b) b.innerHTML = buildingsText(PROJ.result);
  } catch (e) {
    if (token !== PROJ.token) return;
    Object.assign(PROJ, {status: "error", error: e.message || "The projection could not run."});
    render();
  }
}

/* map buildings (from the street map's vector tiles) standing in water at the peak */
function countFloodedBuildings(res) {
  const pts = mapBuildings(res.g.bbox);
  if (!pts.length) return null;
  let wet = 0;
  for (const ll of pts) { const i = res.g.index(ll); if (i >= 0 && !res.fixed[i] && res.peak.depth[i] >= FLOODSIM.WET) wet++; }
  return {wet, seen: pts.length};
}
function buildingsText(res) {
  const b = res.buildings;
  if (!b) return "Buildings: zoom the map in on the area to count the buildings water would reach.";
  return `<b>About ${b.wet.toLocaleString("en-GB")}</b> of the ${b.seen.toLocaleString("en-GB")} buildings on the map here would have water around them at the peak.`;
}

/* ---------- showing ---------- */
const PROJ_COLORS = {};
function rgbOf(cssColor) {
  if (PROJ_COLORS[cssColor]) return PROJ_COLORS[cssColor];
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const g = c.getContext("2d"); g.fillStyle = cssColor; g.fillRect(0, 0, 1, 1);
  return (PROJ_COLORS[cssColor] = Array.from(g.getImageData(0, 0, 1, 1).data.slice(0, 3)));
}
/* one hour of water as a picture laid over the 3D ground */
function projectionImage(res, depth) {
  const {w, h} = res.g, canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d"), img = g.createImageData(w, h);
  const cols = [1, 2, 3, 4].map(k => rgbOf(cssv("--water-" + k)));
  for (let i = 0; i < w * h; i++) {
    const d = depth[i];
    if (res.fixed[i] || d < FLOODSIM.WET) continue;
    const k = d >= 1.2 ? 3 : d >= 0.6 ? 2 : d >= 0.3 ? 1 : 0;
    img.data.set(cols[k], 4 * i);
    img.data[4 * i + 3] = 200;
  }
  g.putImageData(img, 0, 0);
  return canvas.toDataURL("image/png");
}
function projShow(hour) {
  const res = PROJ.result; if (!res) return;
  PROJ.hour = Math.max(0, Math.min(res.frames.length - 1, hour));
  const f = res.frames[PROJ.hour];
  mapProjection(projectionImage(res, f.depth), res.g.bbox);
  const now = $("#proj-now"); if (now) now.innerHTML = projHourText(res, PROJ.hour);
  const sl = $("#proj-slider"); if (sl && +sl.value !== PROJ.hour) sl.value = PROJ.hour;
}
function projHourText(res, k) {
  const f = res.frames[k], d = res.hereIdx >= 0 ? f.depth[res.hereIdx] : 0;
  return `Hour ${k} · <b>${fmtArea(f.km2)}</b> under water · <b>${esc(fmtVolume(f.volume))}</b> of water · at ${esc(res.here.n)}: ${esc(depthWords(d))}${d >= FLOODSIM.WET ? ` (${d.toFixed(2)} m)` : ""}`;
}
function projToggle() {
  if (PROJ.timer) { projStop(); return; }
  const res = PROJ.result; if (!res) return;
  if (PROJ.hour >= res.frames.length - 1) PROJ.hour = 0;
  PROJ.timer = setInterval(() => { if (!PROJ.result || PROJ.hour >= PROJ.result.frames.length - 1 || UI.screen !== "project") { projStop(); return; } projShow(PROJ.hour + 1); }, 900);
  const b = $("#proj-play"); if (b) { b.textContent = "❚❚ Pause"; b.setAttribute("aria-pressed", "true"); }
}
function projStop() {
  clearInterval(PROJ.timer); PROJ.timer = null;
  const b = $("#proj-play"); if (b) { b.textContent = "▶ Play"; b.setAttribute("aria-pressed", "false"); }
}
function projReset() { PROJ.token++; projStop(); Object.assign(PROJ, {status: "idle", result: null, error: "", progress: 0, hour: 0}); mapProjection(null); }

/* ---------- saving as a replay file (administrators import it in the claude.ai page) ---------- */
function projectionReplay(res) {
  const day = res.made.slice(0, 10);
  const id = `proj-${res.t.key.split(":")[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${res.sc.id}-${day.replace(/-/g, "")}`;
  const start = Date.parse(day + "T00:00:00Z");
  return {app: "OpenTracker-replay", version: 1,
    replay: {id, kind: "model", title: `Projected flood: ${res.t.n} (${res.sc.n})`, c: res.t.c, areas: [], bbox: res.g.bbox.map(v => Math.round(v * 1e5) / 1e5),
      source: "Open Tracker flood projection on AWS Terrain Tiles", notes: res.sc.desc, link: "",
      assumptions: projectionAssumptions(res), classes: FLOODSIM.CLASSES, made: res.made, madeWith: "Open Tracker projection 1 (diffusive-wave model)"},
    frames: res.frames.map((f, k) => ({t: new Date(start + k * 3600e3).toISOString(), label: `Hour ${k}`, km2: Math.round(f.km2 * 100) / 100, m3: Math.round(f.volume),
      fc: FLOODSIM.frameCollection(FLOODSIM.classify(f.depth.map((v, i) => (res.fixed[i] ? 0 : v))), res.g.w, res.g.h, res.g.bbox)}))};
}
function projectionAssumptions(res) {
  return [`Ground heights from AWS Terrain Tiles on a ${Math.round(res.g.cell)} m grid over ${res.area.n}; buildings and trees can raise or lower the ground in places.`,
    "60% of the rain runs off; the rest soaks in. Drains and culverts are not modelled: blocked drains make floods worse, working ones smaller.",
    res.sc.riverRise ? `Rivers drawn on the map rise ${res.sc.riverRise} m over ${res.sc.stormHours} hours.` : "Rivers stay at their normal level.",
    res.sea ? `The sea is held at its normal level${res.sc.surge ? ` plus a ${res.sc.surge} m surge` : ""}.` : "No sea in this area.",
    "Water leaves the area at its edges as if the ground carried on gently downhill."];
}
function projExport() {
  const res = PROJ.result; if (!res) return;
  try {
    const file = projectionReplay(res);
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], {type: "application/json"}));
    const a = Object.assign(document.createElement("a"), {href: url, download: file.replay.id + ".json"});
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast("Saved. Import it in Open Tracker Admin → Flood replays.");
  } catch (e) { toast(e.message); }
}

/* ---- core/repo.js ---- */
/* ===== Repository: every write goes through here, is permission-checked, and is audit-logged =====
   Audit entries are one document each in "audit" (readable and writable by Editors only, by database rule),
   so concurrent editors never overwrite each other's log lines. */
class AccessError extends Error {}
const BACKUP_IDS = ["OpenTracker", "FloodTrack"];   /* backups from before the rename still restore */
const REPO = {
  require(ok, what) { if (!DB.api) throw new AccessError("The shared database isn't available here."); if (!ok) throw new AccessError(`Your role doesn't allow you to ${what}.`); },

  async audit(act, coll, id, before, after) {
    const entry = {at: new Date().toISOString(), by: DB.uid || null, role: AUTH.label() || null, act, coll, id: String(id ?? ""), before: before ?? null, after: after ?? null};
    try { await DB.api.collection("audit").doc().set(entry); } catch (e) { /* the change itself stands; the log is best effort */ }
  },

  /* opts.approvedFrom: the change request an administrator is approving */
  async set(coll, rec, opts = {}) {
    REPO.require(canWrite(coll), "change " + coll);
    const gate = opts.approvedFrom ? null : APPROVAL.gate();
    if (gate) return APPROVAL.propose("set", coll, rec, gate);
    const before = data(coll).find(r => r.id === rec.id) || null;
    const body = clone(rec); delete body.id;
    body.updated = new Date().toISOString(); body.updatedBy = DB.uid || null;
    if (opts.approvedFrom) { body.proposedBy = opts.approvedFrom.by || null; body.proposedFor = opts.approvedFrom.agency || null; }
    await DB.api.collection(coll).doc(rec.id).set(body);
    await REPO.audit((opts.approvedFrom ? "approved " : "") + (before ? "edited" : "added"), coll, rec.id, before, Object.assign({id: rec.id}, body));
  },

  async del(coll, id, opts = {}) {
    REPO.require(canDelete(coll), "delete from " + coll);
    const gate = opts.approvedFrom ? null : APPROVAL.gate();
    if (gate) return APPROVAL.propose("delete", coll, id, gate);
    const before = data(coll).find(r => r.id === id) || null;
    await DB.api.collection(coll).doc(id).delete();
    await REPO.audit((opts.approvedFrom ? "approved " : "") + "deleted", coll, id, before, null);
  },

  async setSettings(next, act) {
    REPO.require(AUTH.can("model.manage"), "change model settings");
    const before = DB.cfg || null;
    const body = Object.assign({}, DB.cfg || {}, next, {seeded: true, updated: new Date().toISOString(), updatedBy: DB.uid || null});
    await DB.api.doc("config/settings").set(body);
    await REPO.audit(act || "edited", "settings", "settings", before, body);
  },

  /* ----- people and agencies ----- */
  async setMember(uid, patch) {
    REPO.require(AUTH.can("users.manage") || (patch.role === "agency-publisher" && AUTH.can("agencies.manage")), "manage people");
    if (uid === DB.uid && !AUTH.isOwner && patch.role && patch.role !== AUTH.role()?.id) throw new AccessError("You can't change your own role. Ask another administrator.");
    const before = data("members").find(m => m.id === uid) || null;
    const body = Object.assign({}, before ? clone(before) : {addedBy: DB.uid || null, addedAt: new Date().toISOString(), active: true}, patch);
    delete body.id;
    await DB.api.collection("members").doc(uid).set(body);
    await REPO.audit(before ? "changed access" : "added person", "members", uid, before, Object.assign({id: uid}, body));
    await REPO.syncPublisher(uid, body.active !== false && body.agency ? body.agency : null);
  },
  async removeMember(uid) {
    REPO.require(AUTH.can("users.manage"), "remove people");
    if (uid === DB.uid) throw new AccessError("You can't remove yourself.");
    const before = data("members").find(m => m.id === uid) || null;
    await DB.api.collection("members").doc(uid).delete();
    await REPO.audit("removed person", "members", uid, before, null);
    await REPO.syncPublisher(uid, null);
  },
  /* keep agencies.publishers in step with members: a person publishes for at most one agency */
  async syncPublisher(uid, agencyId) {
    for (const a of agencies()) {
      const has = (a.publishers || []).includes(uid), want = a.id === agencyId;
      if (has === want) continue;
      const body = clone(a); delete body.id;
      body.publishers = want ? [...(a.publishers || []), uid] : (a.publishers || []).filter(x => x !== uid);
      await DB.api.collection("agencies").doc(a.id).set(body);
      await REPO.audit(want ? "linked publisher" : "unlinked publisher", "agencies", a.id, {publisher: uid}, {publisher: want ? uid : null});
    }
  },
  async decideRequest(uid, approve, agencyId) {
    REPO.require(AUTH.can("agencies.manage"), "review agency requests");
    if (approve) await REPO.setMember(uid, {role: "agency-publisher", agency: agencyId, active: true});
    await DB.api.doc(`agencyData/${uid}`).set({decision: {approved: !!approve, agency: agencyId || null, at: new Date().toISOString(), by: DB.uid || null}});
    await REPO.audit(approve ? "approved request" : "declined request", "requests", uid, null, {agency: agencyId || null});
  },
  async withdrawPost(uid, postId) {
    REPO.require(AUTH.can("agencies.manage") || AUTH.can("warnings.manage"), "withdraw agency posts");
    await DB.api.doc(`agencyData/${uid}/posts/${postId}`).update({retracted: true, retractedAt: new Date().toISOString(), retractedBy: DB.uid || null});
    await REPO.audit("withdrew agency post", "agencyPosts", uid + "/" + postId, null, null);
  },

  /* ----- whole-database operations ----- */
  snapshot(fromBuilt) {
    const o = {app: "OpenTracker", version: 3, exported: new Date().toISOString(), settings: fromBuilt ? clone(DEFAULT_SETTINGS) : settings()};
    COLLS.forEach(k => o[k] = clone(fromBuilt ? BUILT[k] : data(k)));
    if (!fromBuilt && !AUTH.can("users.manage")) delete o.members;
    return o;
  },
  async writeAll(src, label) {
    REPO.require(AUTH.can("backup.manage"), "replace all data");
    toast(label + "…");
    let n = 0;
    for (const coll of COLLS) {
      if (!Array.isArray(src[coll])) continue;                 /* a backup without a section leaves that section alone */
      if (coll === "members" && !src.members.some(m => m.id === DB.uid) && !AUTH.isOwner) continue;  /* never lock yourself out */
      const want = src[coll].filter(r => r && typeof r.id === "string" && /^[A-Za-z0-9_\-:.@+~]{1,190}$/.test(r.id));
      const ids = new Set(want.map(r => r.id));
      const existing = DB.cfg ? (DB.cols[coll] || []) : [];
      for (const r of existing) if (!ids.has(r.id)) { await DB.api.collection(coll).doc(r.id).delete(); n++; }
      for (const r of want) { const b = clone(r); delete b.id; await DB.api.collection(coll).doc(r.id).set(b); n++; }
    }
    const cfg = Object.assign(clone(DEFAULT_SETTINGS), src.settings || {}, {seeded: true, updated: new Date().toISOString(), updatedBy: DB.uid || null});
    await DB.api.doc("config/settings").set(cfg);
    await REPO.audit(label, "all data", "-", null, {records: n});
    toast(label + " done.");
  },
  /* first set-up: the owner copies the built-in data into the database */
  async seed() {
    if (!(AUTH.isOwner || AUTH.can("backup.manage"))) throw new AccessError("Only the owner or an administrator can set up the database.");
    const src = REPO.snapshot(true);
    toast("Setting up the database…");
    for (const coll of COLLS) for (const r of src[coll]) { const b = clone(r); delete b.id; await DB.api.collection(coll).doc(r.id).set(b); }
    await DB.api.doc("config/settings").set(Object.assign(clone(DEFAULT_SETTINGS), {seeded: true, updated: new Date().toISOString(), updatedBy: DB.uid || null}));
    await REPO.audit("set up database", "all data", "-", null, null);
    toast("Database ready.");
  }
};
function errText(e) {
  if (e instanceof AccessError) return e.message;
  if (e?.code === "invalid_argument") return "Your sharing access doesn't allow this change. Ask the owner to give you Editor access in the Share menu.";
  if (e?.code === "quota_exceeded") return "The database is full. Delete old records, then try again.";
  if (e?.message && !e.code) return e.message;
  return "That didn't save. Check your connection and try again.";
}

/* ---- ui/map.js ---- */
/* ===== Map: MapLibre with bundled open data (world outlines, rivers, lakes) everywhere, plus — in the public web app —
   OpenStreetMap streets and 3D buildings (OpenFreeMap vector tiles) and 3D ground (Terrarium elevation tiles) ===== */
const MAPV = {map: null, el: null, ready: false, failed: false, onPick: null, onPickPlace: null, last: null, marker: null, basemap: false, glyphs: false, projBox: null};
const cssv = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
/* street map and ground-height sources: only the web app has them (claude.ai pages can't load outside data) */
const mapCfg = () => (window.WEBAPP && typeof window.WEBAPP.mapConfig === "function" ? window.WEBAPP.mapConfig() : null);
const heatColor = lv => cssv("--heat-" + Math.max(0, Math.min(4, lv | 0)));
const floodColor = lv => cssv(lv === "warning" ? "--flood-warning" : "--flood-watch");

function levelColor(lv) { return cssv({low: "--low", med: "--med", high: "--high", vhigh: "--vhigh"}[lv] || "--none"); }

function drawIcon(kind, color) {
  const s = 64, c = document.createElement("canvas"); c.width = c.height = s;
  const g = c.getContext("2d");
  g.lineWidth = 5; g.strokeStyle = "#ffffff"; g.fillStyle = color;
  const path = () => { g.fill(); g.stroke(); };
  g.beginPath();
  if (kind === "low") { g.arc(32, 32, 24, 0, Math.PI * 2); path(); }
  else if (kind === "med") { g.moveTo(32, 6); g.lineTo(58, 54); g.lineTo(6, 54); g.closePath(); path(); }
  else if (kind === "high") { g.moveTo(32, 4); g.lineTo(60, 32); g.lineTo(32, 60); g.lineTo(4, 32); g.closePath(); path(); }
  else if (kind === "vhigh") { const r = 27; for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(32 + r * Math.cos(a), 32 + r * Math.sin(a)); } g.closePath(); path(); }
  else if (kind === "safe") { g.roundRect ? g.roundRect(8, 8, 48, 48, 10) : g.rect(8, 8, 48, 48); path(); g.beginPath(); g.fillStyle = "#fff"; g.fillRect(28, 16, 8, 32); g.fillRect(16, 28, 32, 8); }
  else if (kind === "road") { g.arc(32, 32, 25, 0, Math.PI * 2); path(); g.fillStyle = "#fff"; g.fillRect(16, 27, 32, 10); }
  else if (kind === "dam") { g.moveTo(10, 50); g.lineTo(20, 14); g.lineTo(44, 14); g.lineTo(54, 50); g.closePath(); path(); }
  return g.getImageData(0, 0, s, s);
}
function addIcons(force) {
  const m = MAPV.map;
  const set = {low: levelColor("low"), med: levelColor("med"), high: levelColor("high"), vhigh: levelColor("vhigh"), safe: cssv("--low"), road: cssv("--vhigh"), dam: cssv("--accent")};
  Object.entries(set).forEach(([k, col]) => {
    const img = drawIcon(k, col);
    if (m.hasImage("i-" + k)) { if (force) m.updateImage("i-" + k, img); }
    else m.addImage("i-" + k, img, {pixelRatio: 2});
  });
}
function hexPoly(ll, rkm) {
  const [lon, lat] = ll, out = [];
  const dLat = rkm / 110.574, dLon = rkm / (111.32 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; out.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]); }
  return [out];
}
/* depth classes 1–4 from light to deep blue; satellite water in one strong blue */
function replayColor(kind) {
  return kind === "satellite" ? cssv("--water-sat") : ["match", ["get", "k"], 1, cssv("--water-1"), 2, cssv("--water-2"), 3, cssv("--water-3"), 4, cssv("--water-4"), cssv("--water-2")];
}
function mapReplay(fc, kind) {
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  MAPV.replayKind = kind;
  m.getSource("replay").setData(fc);
  m.setPaintProperty("replayFill", "fill-color", replayColor(kind));
  m.setPaintProperty("replayFill", "fill-opacity", kind === "satellite" ? .55 : .78);
}
function circlePoly(ll, rkm) {
  const [lon, lat] = ll, out = [];
  const dLat = rkm / 110.574, dLon = rkm / (111.32 * Math.cos(lat * Math.PI / 180));
  for (let i = 0; i <= 48; i++) { const a = i * Math.PI / 24; out.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)]); }
  return [out];
}
const FC = features => ({type: "FeatureCollection", features});
const PT = (ll, props) => ({type: "Feature", geometry: {type: "Point", coordinates: ll}, properties: props});

function paintTheme() {
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  m.setPaintProperty("bg", "background-color", cssv("--sea"));
  m.setPaintProperty("worldLand", "fill-color", cssv("--land"));
  m.setPaintProperty("worldLine", "line-color", cssv("--border-line"));
  m.setPaintProperty("land", "fill-color", cssv("--land"));
  if (MAPV.basemap) basemapPaint();
  m.setPaintProperty("borders", "line-color", cssv("--border-line"));
  m.setPaintProperty("admin", "line-color", cssv("--border-line"));
  m.setPaintProperty("lakes", "fill-color", cssv("--sea"));
  m.setPaintProperty("rivers", "line-color", cssv("--water-line"));
  m.setPaintProperty("past", "circle-color", cssv("--accent"));
  m.setPaintProperty("past", "circle-stroke-color", cssv("--surface"));
  m.setPaintProperty("sel", "circle-stroke-color", cssv("--fg"));
  m.setPaintProperty("replayFill", "fill-color", replayColor(MAPV.replayKind || "model"));
  m.setPaintProperty("replayLine", "line-color", cssv("--water-4"));
  addIcons(true);
  if (MAPV.last) mapUpdate(MAPV.last, false);
}

function mapMount(holder, opts) {
  if (!holder) return;
  if (!MAPV.el) { MAPV.el = document.createElement("div"); MAPV.el.id = "map-canvas"; MAPV.el.style.cssText = "position:absolute;inset:0"; }
  holder.replaceWith(MAPV.el);
  if (MAPV.failed) { MAPV.el.innerHTML = `<div class="mapmsg">The map cannot be shown on this device. The list below shows the same areas.</div>`; return; }
  if (!MAPV.map) {
    if (!window.maplibregl) { MAPV.failed = true; MAPV.el.innerHTML = `<div class="mapmsg">The map could not load. The list below shows the same areas.</div>`; return; }
    try {
      MAPV.map = new maplibregl.Map({
        container: MAPV.el, attributionControl: false, maxPitch: 75, center: [3, 8], zoom: 4.6, minZoom: 1, maxZoom: 17,
        style: Object.assign({version: 8, sources: {}, layers: [{id: "bg", type: "background", paint: {"background-color": cssv("--sea")}}]}, mapCfg()?.glyphs ? {glyphs: mapCfg().glyphs} : {})
      });
    } catch (e) { MAPV.failed = true; MAPV.el.innerHTML = `<div class="mapmsg">The map cannot be shown on this device. The list below shows the same areas.</div>`; return; }
    const m = MAPV.map;
    m.on("error", () => {});
    m.on("load", () => {
      MAPV.glyphs = !!mapCfg()?.glyphs;
      m.addSource("world", {type: "geojson", data: GEO.world});
      m.addLayer({id: "worldLand", type: "fill", source: "world", paint: {"fill-color": cssv("--land")}});
      m.addLayer({id: "worldHeat", type: "fill", source: "world", layout: {visibility: "none"}, paint: {"fill-color": cssv("--land"), "fill-opacity": .85}});
      m.addLayer({id: "worldLine", type: "line", source: "world", paint: {"line-color": cssv("--border-line"), "line-width": .6}});
      m.addSource("countries", {type: "geojson", data: GEO.countries});
      m.addSource("admin", {type: "geojson", data: GEO.adminlines});
      m.addSource("rivers", {type: "geojson", data: GEO.rivers});
      m.addSource("lakes", {type: "geojson", data: GEO.lakes});
      ["hot", "hexL", "hexS", "past", "safe", "roads", "dams", "sel", "reach", "replay", "heatReach", "heatTowns", "floodReach"].forEach(id => m.addSource(id, {type: "geojson", data: FC([])}));
      m.addLayer({id: "land", type: "fill", source: "countries", maxzoom: 9, paint: {"fill-color": cssv("--land")}});
      m.addLayer({id: "lakes", type: "fill", source: "lakes", paint: {"fill-color": cssv("--sea")}});
      m.addLayer({id: "rivers", type: "line", source: "rivers", paint: {"line-color": cssv("--water-line"), "line-width": ["interpolate", ["linear"], ["zoom"], 4, .8, 9, 2.2]}});
      m.addLayer({id: "admin", type: "line", source: "admin", paint: {"line-color": cssv("--border-line"), "line-width": .8, "line-dasharray": [3, 2]}});
      m.addLayer({id: "borders", type: "line", source: "countries", paint: {"line-color": cssv("--border-line"), "line-width": 1.4}});
      /* outlook: how far water can spread around each area */
      /* replays: water from the flood model (by depth) or seen by satellite */
      m.addLayer({id: "replayFill", type: "fill", source: "replay", paint: {"fill-color": replayColor("model"), "fill-opacity": .78}});
      m.addLayer({id: "replayLine", type: "line", source: "replay", paint: {"line-color": cssv("--water-4"), "line-width": .6, "line-opacity": .6}});
      /* projected reach of heat (warm discs around each town) and floods (blue discs, official warning areas) */
      m.addLayer({id: "heatReach", type: "fill", source: "heatReach", paint: {"fill-color": ["get", "color"], "fill-opacity": .32}});
      m.addLayer({id: "floodReach", type: "fill", source: "floodReach", paint: {"fill-color": ["get", "color"], "fill-opacity": .22}});
      m.addLayer({id: "floodReachLine", type: "line", source: "floodReach", paint: {"line-color": ["get", "color"], "line-width": 1.6, "line-dasharray": [2, 1]}});
      m.addLayer({id: "heatTowns", type: "circle", source: "heatTowns", paint: {"circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 6, 5, 10, 8], "circle-stroke-width": 1.2, "circle-stroke-color": cssv("--surface")}});
      m.addLayer({id: "reach", type: "fill", source: "reach", paint: {"fill-color": ["get", "color"], "fill-opacity": .16}});
      m.addLayer({id: "reachLine", type: "line", source: "reach", paint: {"line-color": ["get", "color"], "line-width": 1.2, "line-opacity": .7}});
      m.addLayer({id: "hexL", type: "fill-extrusion", source: "hexL", maxzoom: 8.5, layout: {visibility: "none"}, paint: {"fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "hL"], "fill-extrusion-opacity": .88}});
      m.addLayer({id: "hexS", type: "fill-extrusion", source: "hexS", minzoom: 8.5, layout: {visibility: "none"}, paint: {"fill-extrusion-color": ["get", "color"], "fill-extrusion-height": ["get", "hS"], "fill-extrusion-opacity": .88}});
      m.addLayer({id: "past", type: "circle", source: "past", layout: {visibility: "none"}, paint: {"circle-color": cssv("--accent"), "circle-opacity": ["get", "op"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["+", 4, ["*", 1.5, ["get", "n"]]], 11, ["+", 10, ["*", 3, ["get", "n"]]]], "circle-stroke-width": 1.5, "circle-stroke-color": cssv("--surface")}});
      m.addLayer({id: "sel", type: "circle", source: "sel", paint: {"circle-radius": 22, "circle-color": "rgba(0,0,0,0)", "circle-stroke-width": 3, "circle-stroke-color": cssv("--fg")}});
      const iconLayer = (id, src) => m.addLayer({id, type: "symbol", source: src, layout: {"icon-image": ["get", "icon"], "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-size": ["interpolate", ["linear"], ["zoom"], 4, .5, 8, .75, 12, 1], "symbol-sort-key": ["get", "rank"]}});
      iconLayer("dams", "dams"); iconLayer("roads", "roads"); iconLayer("safe", "safe"); iconLayer("hot", "hot");
      addIcons(false);
      m.on("click", "heatTowns", e => { const id = e.features?.[0]?.properties?.id; if (id && MAPV.onPickPlace) MAPV.onPickPlace(id); });
      m.on("click", "worldHeat", e => { const c = e.features?.[0]?.properties?.c; if (c && MAPV.onPickCountry) MAPV.onPickCountry(c); });
      ["heatTowns", "worldHeat"].forEach(l => { m.on("mouseenter", l, () => m.getCanvas().style.cursor = "pointer"); m.on("mouseleave", l, () => m.getCanvas().style.cursor = ""); });
      ["hot", "hexS", "hexL"].forEach(l => {
        m.on("click", l, e => { const id = e.features?.[0]?.properties?.id; if (id && MAPV.onPick) MAPV.onPick(id); });
        m.on("mouseenter", l, () => m.getCanvas().style.cursor = "pointer");
        m.on("mouseleave", l, () => m.getCanvas().style.cursor = "");
      });
      MAPV.ready = true;
      if (MAPV.last) mapUpdate(MAPV.last, true);
    });
  } else {
    requestAnimationFrame(() => MAPV.map && MAPV.map.resize());
  }
}

/* view: {hot:[{h,r}], past:[{h,n,year}], safe:[], roads:[], dams:[], show:'risk'|..., three, sel, fit} */
function mapUpdate(view, fit) {
  MAPV.last = view;
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  const hot = view.show === "risk" ? view.hot : [];
  m.getSource("hot").setData(FC(hot.map(({h, r}) => PT(h.ll, {id: h.id, icon: "i-" + r.level, rank: -LVL_RANK[r.level]}))));
  const three = !!view.three && view.show === "risk";
  const hexF = (rk, key, scale) => FC(hot.map(({h, r}) => ({type: "Feature", geometry: {type: "Polygon", coordinates: hexPoly(h.ll, rk)}, properties: {id: h.id, color: levelColor(r.level), [key]: 200 + Math.min(1.5, r.score) * scale}})));
  if (view.show !== "replay") m.getSource("replay").setData(FC([]));   /* replay screens and past years draw their own */
  m.getSource("reach").setData(FC((view.show === "risk" ? view.reach || [] : []).map(x => ({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(x.ll, x.km)}, properties: {color: levelColor(x.level)}}))));
  m.getSource("hexL").setData(hexF(5, "hL", 90000));
  m.getSource("hexS").setData(hexF(.55, "hS", 4000));
  ["hexL", "hexS"].forEach(l => m.setLayoutProperty(l, "visibility", three ? "visible" : "none"));
  m.setLayoutProperty("hot", "visibility", view.show === "risk" && !three ? "visible" : "none");
  m.getSource("past").setData(FC((view.show === "past" ? view.past : []).map(p => PT(p.h.ll, {id: p.h.id, n: Math.min(6, p.n), op: p.recent}))));
  m.setLayoutProperty("past", "visibility", view.show === "past" ? "visible" : "none");
  m.getSource("safe").setData(FC((view.show === "safe" ? view.safe : []).map(s => PT(s.ll, {icon: "i-safe", rank: 0}))));
  m.getSource("roads").setData(FC((view.show === "roads" ? view.roads : []).map(s => PT(s.ll, {icon: "i-road", rank: 0}))));
  m.getSource("dams").setData(FC((view.dams || []).map(d => PT(d.ll, {icon: "i-dam", rank: 1}))));
  m.getSource("sel").setData(FC(view.sel ? [PT(view.sel.ll, {})] : []));
  if (MAPV.marker) { MAPV.marker.remove(); MAPV.marker = null; }
  if (view.sel && window.maplibregl) {
    const d = document.createElement("div"); d.className = "mk"; d.textContent = view.sel.n;
    MAPV.marker = new maplibregl.Marker({element: d, anchor: "bottom"}).setLngLat(view.sel.ll).addTo(m);
  }
  mapHazards(view);
  mapStreets(view);
  const pitch = view.terrain ? 60 : three ? (view.pitch ?? 55) : 0;
  if (fit && view.fit) {
    const f = view.fit;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (f.bounds && (f.bounds[1][0] - f.bounds[0][0] > .02 || f.bounds[1][1] - f.bounds[0][1] > .02)) m.fitBounds(f.bounds, {padding: 60, maxZoom: f.maxZoom || 12, pitch, bearing: three ? -12 : 0, duration: reduce ? 0 : 900});
    else m.easeTo({center: f.ll, zoom: f.z, pitch, bearing: three ? -12 : 0, duration: reduce ? 0 : 900});
  } else if (m.getPitch() !== pitch) m.easeTo({pitch, bearing: three ? -12 : 0, duration: 500});
}
function mapZoom(d) { if (MAPV.map) MAPV.map.zoomTo(MAPV.map.getZoom() + d, {duration: 300}); }
function mapFly(ll, z) { if (MAPV.map) MAPV.map.easeTo({center: ll, zoom: z, duration: 800}); }

/* ---------- projected reach of heat and floods ---------- */
/* view.world: {CC: heat level}; view.heatTowns: [{id, ll, level, pop}]; view.floodSigns: [{ll, km, bbox, level, areas}] */
function mapHazards(view) {
  const m = MAPV.map;
  const world = view.world || null;
  m.setLayoutProperty("worldHeat", "visibility", world ? "visible" : "none");
  m.setLayoutProperty("land", "visibility", world ? "none" : "visible");   /* the detailed West African layer would cover the colours */
  if (world) {
    const pairs = Object.entries(world).filter(([, lv]) => Number.isFinite(lv)).flatMap(([c, lv]) => [c, heatColor(lv)]);
    m.setPaintProperty("worldHeat", "fill-color", pairs.length ? ["match", ["get", "c"], ...pairs, cssv("--land")] : cssv("--land"));
  }
  const towns = view.heatTowns || [];
  m.getSource("heatTowns").setData(FC(towns.map(t => PT(t.ll, {id: t.id, color: heatColor(t.level)}))));
  m.getSource("heatReach").setData(FC(towns.filter(t => t.level >= 2).map(t => ({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(t.ll, heatReachKm(t.level, t.pop))}, properties: {color: heatColor(t.level)}}))));
  const shapes = [];
  for (const s of view.floodSigns || []) {
    const props = {color: floodColor(s.level)};
    if (s.alert) {
      for (const a of s.alert.areas || []) {
        (a.polygons || []).forEach(r => shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: [r]}, properties: props}));
        (a.circles || []).forEach(c => shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(c.ll, Math.max(1, c.km))}, properties: props}));
      }
    } else if (s.bbox && s.kind === "disaster") {
      const [w, so, e, n] = s.bbox;
      shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: [[[w, so], [e, so], [e, n], [w, n], [w, so]]]}, properties: props});
    } else if (s.ll) shapes.push({type: "Feature", geometry: {type: "Polygon", coordinates: circlePoly(s.ll, s.km || 15)}, properties: props});
  }
  m.getSource("floodReach").setData(FC(shapes));
}

/* ---------- streets, 3D buildings and 3D ground (web app) ---------- */
function addBasemap() {
  const cfg = mapCfg(), m = MAPV.map;
  if (!cfg || !cfg.tiles || MAPV.basemap) return;
  const before = m.getLayer("replayFill") ? "replayFill" : undefined;
  m.addSource("omt", {type: "vector", url: cfg.tiles, attribution: "© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap"});
  m.addLayer({id: "omtLanduse", type: "fill", source: "omt", "source-layer": "landcover", minzoom: 10, paint: {"fill-color": cssv("--land-dim"), "fill-opacity": .5}}, before);
  m.addLayer({id: "omtWater", type: "fill", source: "omt", "source-layer": "water", minzoom: 8, paint: {"fill-color": cssv("--sea")}}, before);
  m.addLayer({id: "omtWaterway", type: "line", source: "omt", "source-layer": "waterway", minzoom: 10, paint: {"line-color": cssv("--water-line"), "line-width": ["match", ["get", "class"], "river", 2.4, 1]}}, before);
  m.addLayer({id: "omtRoads", type: "line", source: "omt", "source-layer": "transportation", minzoom: 10, paint: {"line-color": cssv("--surface"), "line-width": ["interpolate", ["linear"], ["zoom"], 10, .4, 15, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 5, 2]]}}, before);
  m.addLayer({id: "omtBuildings", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13,
    paint: {"fill-extrusion-color": cssv("--building"), "fill-extrusion-height": ["coalesce", ["get", "render_height"], 4], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": .9}}, "heatTowns");   /* above the water and reach discs, below markers */
  if (MAPV.glyphs) {
    m.addLayer({id: "omtPlaces", type: "symbol", source: "omt", "source-layer": "place", minzoom: 9,
      layout: {"text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": ["match", ["get", "class"], ["city", "town"], 14, 12]},
      paint: {"text-color": cssv("--fg"), "text-halo-color": cssv("--surface"), "text-halo-width": 1.5}});
    m.addLayer({id: "omtStreetNames", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 14,
      layout: {"symbol-placement": "line", "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11},
      paint: {"text-color": cssv("--muted"), "text-halo-color": cssv("--surface"), "text-halo-width": 1.2}});
  }
  if (cfg.terrain) {
    m.addSource("dem", {type: "raster-dem", tiles: [cfg.terrain], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Ground heights: AWS Terrain Tiles (SRTM, GMTED2010, ETOPO1, 3DEP, EU-DEM)"});
    m.addLayer({id: "hillshade", type: "hillshade", source: "dem", minzoom: 9, paint: {"hillshade-exaggeration": .35, "hillshade-shadow-color": cssv("--hill")}}, before);
  }
  MAPV.basemap = true;
}
const BASEMAP_LAYERS = ["omtLanduse", "omtWater", "omtWaterway", "omtRoads", "omtBuildings", "omtPlaces", "omtStreetNames", "hillshade"];
function basemapPaint() {
  const m = MAPV.map, set = (l, k, v) => { if (m.getLayer(l)) m.setPaintProperty(l, k, v); };
  set("omtLanduse", "fill-color", cssv("--land-dim")); set("omtWater", "fill-color", cssv("--sea")); set("omtWaterway", "line-color", cssv("--water-line"));
  set("omtRoads", "line-color", cssv("--surface")); set("omtBuildings", "fill-extrusion-color", cssv("--building"));
  set("omtPlaces", "text-color", cssv("--fg")); set("omtPlaces", "text-halo-color", cssv("--surface"));
  set("omtStreetNames", "text-color", cssv("--muted")); set("omtStreetNames", "text-halo-color", cssv("--surface"));
  set("hillshade", "hillshade-shadow-color", cssv("--hill"));
}
/* view.streets: show the street map; view.terrain: 3D ground */
function mapStreets(view) {
  const m = MAPV.map;
  if (view.streets) addBasemap();
  if (!MAPV.basemap) return;
  BASEMAP_LAYERS.forEach(l => { if (m.getLayer(l)) m.setLayoutProperty(l, "visibility", view.streets ? "visible" : "none"); });
  const want = !!(view.terrain && m.getSource("dem"));
  try { m.setTerrain(want ? {source: "dem", exaggeration: 1.4} : null); } catch (e) { /* older devices: stay flat */ }
}
/* the projected water for one hour, laid over the ground; null removes it */
function mapProjection(url, bbox) {
  const m = MAPV.map; if (!m || !MAPV.ready) return;
  if (!url) { if (m.getLayer("projImg")) m.setLayoutProperty("projImg", "visibility", "none"); return; }
  const coordinates = [[bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]]];
  const src = m.getSource("proj");
  if (src) src.updateImage({url, coordinates});
  else {
    m.addSource("proj", {type: "image", url, coordinates});
    m.addLayer({id: "projImg", type: "raster", source: "proj", paint: {"raster-opacity": .82, "raster-fade-duration": 0, "raster-resampling": "nearest"}}, m.getLayer("omtBuildings") ? "omtBuildings" : "replayFill");
  }
  m.setLayoutProperty("projImg", "visibility", "visible");
}
/* features from the street map's loaded tiles inside a box */
function inBox(ll, b) { return ll[0] >= b[0] && ll[0] <= b[2] && ll[1] >= b[1] && ll[1] <= b[3]; }
function mapWaterways(bbox) {
  const m = MAPV.map; if (!m || !m.getSource("omt")) return [];
  const lines = [];
  for (const f of m.querySourceFeatures("omt", {sourceLayer: "waterway"})) {
    if (!["river", "canal"].includes(f.properties.class)) continue;
    const g = f.geometry, parts = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
    parts.forEach(p => { if (p.some(ll => inBox(ll, bbox))) lines.push(p); });
  }
  return lines;
}
function mapBuildings(bbox) {
  const m = MAPV.map; if (!m || !m.getSource("omt")) return [];
  const seen = new Set(), out = [];
  for (const f of m.querySourceFeatures("omt", {sourceLayer: "building"})) {
    const g = f.geometry, ring = g.type === "Polygon" ? g.coordinates[0] : g.type === "MultiPolygon" ? g.coordinates[0][0] : null;
    if (!ring || !ring.length) continue;
    const ll = [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
    const key = f.id !== undefined ? "i" + f.id : ll[0].toFixed(6) + "," + ll[1].toFixed(6);   /* a building cut by tile edges counts once */
    if (seen.has(key) || !inBox(ll, bbox)) continue;
    seen.add(key); out.push(ll);
  }
  return out;
}

/* theme follow *//* theme follow */
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => setTimeout(paintTheme, 50));
new MutationObserver(() => setTimeout(paintTheme, 50)).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});

/* ---- ui/views-simple.js ---- */
/* ===== Simple mode: three filters, plain words ===== */
/* ---------- Simple mode screens ---------- */
function viewWhere() {
  const c = UI.pickCountry;
  let body = "";
  if (!c) {
    body = `
      <div class="search">
        <label for="q">Type your town, area, region, state, river or country</label>
        <input id="q" type="search" autocomplete="off" placeholder="For example: Kaneshie, Lekki, Mumbai, Houston" value="${esc(UI.q)}" aria-describedby="qhelp">
        <span id="qhelp" class="small muted">Choose from the list that appears.</span>
        <div class="results" id="results" aria-live="polite">${resultsHtml()}</div>
      </div>
      <button class="btn primary outlook-btn" data-act="world">${ICON.info}Flood and heat around the world</button>
      <button class="btn outlook-btn" data-act="outlook">${ICON.info}See the ${outlookSettings().year} rainy season outlook (Ghana and Nigeria)</button>
      <button class="btn outlook-btn" data-act="replays">${ICON.info}Watch floods over time</button>
      <h2>Or choose a country</h2>
      <div class="countries">
        <button class="btn" data-act="country" data-id="GH">Ghana</button>
        <button class="btn" data-act="country" data-id="NG">Nigeria</button>
      </div>
      ${countrySelect("")}`;
  } else {
    const cc = FT.countries[c];
    const areas = FT.areas.filter(a => a.c === c).map(a => {
      const hs = IX.hot.filter(h => h.r === a.id);
      const lv = hs.length ? maxLevel(hs.map(h => riskOf(h, simpleCtx("3d")))) : "none";
      return {a, hs, lv};
    }).sort((x, y) => (LVL_RANK[y.lv] ?? -1) - (LVL_RANK[x.lv] ?? -1) || y.hs.length - x.hs.length || x.a.n.localeCompare(y.a.n));
    body = `
      <button class="back" data-act="back-country">← Back</button>
      <h2>Choose a ${cc.unit} in ${esc(cc.n)}</h2>
      <p class="muted">Sorted by flood risk for the next 3 days. The number shows known flood areas.</p>
      <button class="btn primary" data-act="open" data-type="country" data-id="${c}">See all of ${esc(cc.n)}</button>
      <div class="list">${areas.map(({a, hs, lv}) => `
        <button class="pick" data-act="open" data-type="area" data-id="${a.id}">
          <span class="grow"><span class="t">${esc(a.n)}</span><span class="s">${hs.length ? hs.length + " known flood area" + (hs.length > 1 ? "s" : "") : "No areas recorded yet"}</span></span>
          ${hs.length ? chip(lv) : ""}
        </button>`).join("")}</div>`;
  }
  return `
    <h1>Is my area at risk of flooding or dangerous heat?</h1>
    ${body}
    ${c ? "" : contributeCta(null)}`;
}
function resultsHtml() {
  if (norm(UI.q).length < 2) return "";
  const r = search(UI.q);
  if (!r.length) return `<p class="muted">No match for “${esc(UI.q)}”. Check the spelling, or choose a country below.</p>`;
  return r.map(x => `<button class="pick" data-act="open" data-type="${x.p.type}" data-id="${x.p.id ?? ""}" data-idx="${x.p.idx ?? ""}"><span class="grow"><span class="t">${esc(x.t)}</span><span class="s">${esc(x.s)}</span></span><span aria-hidden="true">→</span></button>`).join("");
}

const ADVICE = {
  low: ["Keep the drains and gutters near your home clear of rubbish.", "Save the emergency number below in your phone.", "Check Open Tracker again when heavy rain is forecast."],
  med: ["Move documents, phones and valuables off the floor.", "Clear drains and gutters around your home.", "Plan where you would go if water rises, and how you would get there.", "Do not park in low spots or beside drains."],
  high: ["Pack a small bag: documents, medicine, phone charger, drinking water.", "Never walk or drive through moving water. Even knee-deep water can sweep people and cars away.", "If water enters your home, switch off electricity at the main switch.", "Do not shelter at fuel stations.", "Follow instructions from NADMO, NEMA or your state emergency agency."],
  vhigh: ["If water is rising, move to higher ground or a safe place now.", "Take children, older people and anyone who needs help with you.", "Never walk or drive through moving water.", "Switch off electricity at the main switch before you leave.", "If you are trapped, go to the highest point and call the emergency number below."]
};

function viewAnswer() {
  const p = UI.place;
  if (!p) { UI.screen = "where"; return viewWhere(); }
  if (p.type === "wc") return viewReach(p.id);         /* any country: its flood and heat reach */
  if (p.type === "wp") return viewWorldPlace(p);       /* any town: heat, flood signs, 3D projection */
  const hs = placeHot(p);
  const ctx = simpleCtx();
  const isOne = p.type === "hotspot";
  const c = placeCountry(p);
  const whenBtns = `<div class="when" role="group" aria-label="When">${HORIZONS.map(h => `<button data-act="when" data-k="${h.k}" aria-pressed="${UI.when === h.k}">${h.n}</button>`).join("")}</div>`;
  const crumbs = crumbsFor(p);
  let main = "";
  const evs = eventsFor(p);
  if (UI.when === "past") {
    main = `
      <div class="card">
        <h2>${evs.length ? `${evs.length} flood${evs.length > 1 ? "s" : ""} recorded here` : "No floods recorded here yet"}</h2>
        ${evs.length ? "" : `<p>We have no published reports of floods ${isOne ? "in this area" : "here"} yet. That does not mean it never floods.</p>`}
        ${evList(evs, 50)}
      </div>`;
  } else if (!hs.length) {
    main = `
      <div class="riskcard lv-none">${icon("none", 56)}<div><div class="big">Not enough data yet</div><div class="sub">We have no recorded flood areas here yet. Low land near rivers, lagoons and big drains can still flood in heavy rain.</div></div></div>`;
  } else if (isOne) {
    const h = hs[0], r = riskOf(h, ctx);
    const L = LEVELS.find(l => l.k === r.level);
    main = `
      <div class="riskcard lv-${r.level}" id="say">${icon(r.level, 56)}<div><div class="big">${L.word}</div><div class="sub">of flooding ${UI.when === "today" ? "today" : UI.when === "3d" ? "in the next 3 days" : UI.when === "year" ? `in the ${outlookSettings().year} rainy season (about ${Math.round(r.P * 100)}% chance)` : "in the next 3 months"}.</div></div></div>
      <div class="card">
        <h3>Why?</h3>
        <ul class="plain why">${r.causes.map(x => `<li>${esc(x.t)}</li>`).join("")}${r.outlook ? `<li>${esc(reachText(r))}</li><li>${esc("Months to watch: " + monthRange(r.months) + ".")}</li>` : ""}${h.why ? `<li>${esc(h.why)}</li>` : ""}</ul>
      </div>
      ${actionsHtml(r.level, p)}`;
  } else {
    const rs = hs.map(h => ({h, r: riskOf(h, ctx)})).sort((a, b) => b.r.score - a.r.score);
    const lv = maxLevel(rs.map(x => x.r));
    const counts = LEVELS.map(l => [l, rs.filter(x => x.r.level === l.k).length]).filter(x => x[1]);
    main = `
      <div class="riskcard lv-${lv}" id="say">${icon(lv, 56)}<div><div class="big">Highest: ${LEVELS.find(l => l.k === lv).word}</div><div class="sub">${counts.map(([l, n]) => `${n} ${l.n.toLowerCase()}`).join(" · ")} — across ${rs.length} known flood area${rs.length > 1 ? "s" : ""}, ${UI.when === "today" ? "today" : UI.when === "3d" ? "next 3 days" : "next 3 months"}.</div></div></div>
      <div class="card">
        <h2>Areas to watch</h2>
        <p class="small muted">Tap an area to see why and what to do.</p>
        <div class="results">${rs.slice(0, 40).map(({h, r}) => `<button class="pick" data-act="open" data-type="hotspot" data-id="${h.id}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))}</span></span>${chip(r.level)}</button>`).join("")}</div>
      </div>
      ${actionsHtml(lv, p)}`;
  }
  return `
    <button class="back" data-act="back">← Back</button>
    <nav class="crumbs" aria-label="You are here">${crumbs.map((x, i) => i < crumbs.length - 1 ? `<button data-act="open" data-type="${x.p.type}" data-id="${x.p.id ?? ""}" data-idx="${x.p.idx ?? ""}">${esc(x.n)}</button><span aria-hidden="true">›</span>` : `<span>${esc(x.n)}</span>`).join("")}</nav>
    <h1>${esc(placeName(p))}</h1>
    ${alertBanners(p)}
    ${whenBtns}
    ${main}
    ${UI.when !== "past" ? liveCardsFor(p) : ""}
    ${alertMeHtml(p)}
    ${UI.when !== "past" && evs.length ? `<div class="card"><h2>Past floods here</h2>${evList(evs, 4)}${evs.length > 4 ? `<button class="sbtn" data-act="when" data-k="past">See all ${evs.length}</button>` : ""}</div>` : ""}
    ${nearReadings(p)}
    ${replaysCard(p)}
    <button class="btn" data-act="to-map">See it on the map</button>
    ${emergencyHtml(c)}
    ${contributeCta(p)}
    ${UI.when !== "past" ? dataNote() : ""}`;
}
function replaysCard(p) {
  const list = replaysFor(p);
  return list.length ? `<div class="card"><h2>Watch floods here over time</h2><div class="results">${list.slice(0, 6).map(replayPick).join("")}</div></div>` : "";
}
function nearReadings(p) {
  const c = placeCenter(p).ll;
  const list = officialReadings().filter(r => r.ll && km(c, r.ll) < 40).slice(0, 5);
  return list.length ? `<div class="card"><h2>Latest official readings nearby</h2>${readingsHtml(list)}</div>` : "";
}
function evList(evs, n) {
  return `<div class="plain" style="display:flex;flex-direction:column;gap:10px">${evs.slice(0, n).map(e => `
    <div class="event"><span class="y">${esc(evDate(e))}</span><span><b>${esc(e.t)}</b></span><span class="small">${esc(e.impact)}</span>${safeUrl(e.src) ? `<a class="small" href="${esc(safeUrl(e.src))}" target="_blank" rel="noopener">Source: ${esc(srcHost(e.src))}</a>` : ""}</div>`).join("")}</div>`;
}
function actionsHtml(lv, p) {
  const open = UI.open;
  const center = placeCenter(p);
  const c = placeCountry(p);
  const near = data("safe").filter(s => !c || s.c === c).map(s => ({s, d: km(center.ll, s.ll)})).filter(x => x.d < 40).sort((a, b) => a.d - b.d).slice(0, 3);
  return `
    <div class="row">
      <button class="btn primary" data-act="toggle" data-k="todo" aria-expanded="${!!open.todo}">What should I do?</button>
      <button class="btn" data-act="toggle" data-k="safe" aria-expanded="${!!open.safe}">Nearest safe place</button>
    </div>
    ${open.todo ? `<div class="card lv-${lv}"><h2>What to do now</h2><ul class="steps">${ADVICE[lv].map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>` : ""}
    ${open.safe ? `<div class="card"><h2>Nearest safe places</h2>${near.length ? `<ul class="plain">${near.map(x => `<li><b>${esc(x.s.n)}</b><br><span class="small muted">About ${x.d < 1 ? "under 1" : Math.round(x.d)} km away · named by ${esc(x.s.src)}</span></li>`).join("")}</ul><p class="small muted">Check with NADMO that a safe place is open before you go.</p>` : `<p>No safe places are listed for this area yet. Call the emergency number below and ask where to go.</p>`}<button class="sbtn" data-act="map-safe">Show safe places on the map</button></div>` : ""}`;
}
function emergencyHtml(c) {
  const list = c ? emergencyNumbers(c) : data("contacts");
  if (!list.length) return "";
  return `<div class="card"><h2>Emergency numbers</h2>${list.map(x => `<div class="phone"><span>${esc(x.n)}:</span><span class="n">${esc(x.num)}</span><button class="sbtn" data-act="copy" data-v="${esc(x.num)}">Copy</button></div>`).join("")}<p class="small muted">Call from your phone. Open Tracker cannot place calls.${c && !DETAILED.has(c) ? " Numbers from Google's public phone-number data; check them locally." : ""}</p></div>`;
}

function viewMap() {
  const p = UI.place;
  const showSel = `<select id="show" aria-label="Show">${SHOWS.map(s => `<option value="${s.k}" ${UI.show === s.k ? "selected" : ""}>${s.n}</option>`).join("")}</select>`;
  const whenSel = `<select id="when" aria-label="When">${HORIZONS.filter(h => h.k !== "past").map(h => `<option value="${h.k}" ${UI.when === h.k ? "selected" : ""}>${h.n}</option>`).join("")}</select>`;
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Map</h1>
    <div class="pills">
      <label class="pill"><span>Where</span><button data-act="change-where">${esc(p ? placeName(p) : "Ghana and Nigeria")} ▾</button></label>
      <label class="pill"><span>When</span>${UI.show === "past" ? `<button disabled>Past years</button>` : whenSel}</label>
      <label class="pill"><span>Show</span>${showSel}</label>
    </div>
    ${UI.show === "past" ? yearSliderHtml() : ""}
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Flood map"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button><button class="wide" data-act="three" aria-pressed="${UI.three}">${UI.three ? "Flat map" : "See in 3D"}</button></div>
      <div class="mapattr">Map data: Natural Earth · MapLibre</div>
    </div>
    ${legendHtml()}
    <div class="card"><h2>${esc(mapListTitle())}</h2><div class="results">${mapListHtml()}</div></div>
    ${dataNote()}`;
}
function yearMatch(e, y) {
  if (y === "all") return true;
  if (y === "unknown") return !e.year;
  if (y === "older") return e.year && e.year < 2022;
  return String(e.year) === y;
}
function legendHtml() {
  if (UI.show === "risk") return `<div class="legend" aria-label="Legend">${LEVELS.map(l => `<span class="lv-${l.k}">${icon(l.k, 20)}${l.n}</span>`).join("")}</div>`;
  if (UI.show === "safe") return `<div class="legend"><span><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" fill="var(--low)"/><path d="M12 6v12M6 12h12" stroke="#fff" stroke-width="3"/></svg>Safe place named by NADMO or AMA</span></div>`;
  if (UI.show === "roads") return `<div class="legend"><span><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--vhigh)"/><rect x="5.5" y="10" width="13" height="4" fill="#fff"/></svg>Road reported impassable in past floods</span></div>`;
  return `<div class="legend"><span><svg width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="var(--accent)"/></svg>Area flooded in the chosen year (darker = more recent)</span></div>`;
}
function mapListTitle() {
  return {risk: "Areas on the map", safe: "Safe places", past: "Floods in the chosen years", roads: "Roads to avoid in heavy rain"}[UI.show];
}
function inPlace(ll) {
  const p = UI.place;
  if (!p) return true;
  const hs = placeHot(p);
  if (p.type === "country") return true;
  if (!hs.length) return false;
  return hs.some(h => km(h.ll, ll) < (p.type === "hotspot" ? 15 : 60));
}
function mapListHtml() {
  const p = UI.place, c = p ? placeCountry(p) : null;
  if (UI.show === "risk") {
    const hs = p ? placeHot(p) : IX.hot;
    const rs = hs.map(h => ({h, r: riskOf(h)})).sort((a, b) => b.r.score - a.r.score);
    return rs.slice(0, 30).map(({h, r}) => `<button class="pick" data-act="open" data-type="hotspot" data-id="${h.id}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))}</span></span>${chip(r.level)}</button>`).join("") || `<p class="muted">No known flood areas here yet.</p>`;
  }
  if (UI.show === "safe") {
    const l = data("safe").filter(s => (!c || s.c === c) && inPlace(s.ll));
    return l.length ? l.map(s => `<div class="pick" role="listitem"><span class="grow"><span class="t">${esc(s.n)}</span><span class="s">Named by ${esc(s.src)}</span></span></div>`).join("") : `<p class="muted">No safe places are listed here yet. Call the emergency number and ask where to go.</p>`;
  }
  if (UI.show === "roads") {
    const l = data("roads").filter(s => (!c || s.c === c) && inPlace(s.ll));
    return l.length ? l.map(s => `<div class="pick"><span class="grow"><span class="t">${esc(s.n)}</span></span></div>`).join("") : `<p class="muted">No roads reported here yet.</p>`;
  }
  const evs = (p ? eventsFor(p) : data("events").concat(data("regionEvents"))).filter(e => yearMatch(e, UI.year));
  return evs.length ? evList(evs.sort((a, b) => (b.year || 0) - (a.year || 0)), 60) : `<p class="muted">No floods recorded for this choice.</p>`;
}

/* ---------- data status (public) ---------- */
function feedRow(name, what, status, last) {
  const cls = status === "on" ? "on" : status === "manual" ? "manual" : "off";
  const txt = status === "on" ? "Connected" : status === "manual" ? "Entered by staff" : "Not connected yet";
  return `<div class="feed"><div><b>${esc(name)}</b><br><span class="muted">${esc(what)}</span>${last ? `<br><span class="small muted">Last update ${esc(fmtDate(last))}</span>` : ""}</div><span class="status ${cls}">${txt}</span></div>`;
}
function readingsHtml(list) {
  return `<ul class="plain">${list.map(r => `<li><b>${esc(r.station)}</b>: <span class="num">${esc(r.value)}</span> ${esc((READING_KINDS.find(k => k[0] === r.kind) || [0, ""])[1])}<br><span class="small muted">${esc(r.agency.n)} · ${esc(fmtDate(r.at))}</span></li>`).join("")}</ul>`;
}
function viewStatus() {
  const pm = publisherMap();
  const live = new Set(Object.values(pm).map(a => a.id));
  const lastBy = {};
  Object.entries(AG.posts).forEach(([uid, l]) => { const a = pm[uid]; if (a && l[0] && (!lastBy[a.id] || l[0].at > lastBy[a.id])) lastBy[a.id] = l[0].at; });
  const fc = Object.keys(settings().climate).filter(z => rainScenarioFor(z));
  const rd = officialReadings().slice(0, 12);
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Where Open Tracker's information comes from</h1>
    <div class="card"><h2>Official agencies</h2>
      <p>When an agency is connected, its warnings, forecasts and readings appear on Open Tracker within seconds, with its name beside them.</p>
      ${agencies().filter(a => a.status !== "suspended").map(a => feedRow(a.n, a.supplies || "", live.has(a.id) ? "on" : "off", lastBy[a.id])).join("")}
    </div>
    ${window.WEBAPP ? window.WEBAPP.statusHtml() : ""}
    <div class="card"><h2>Other data feeds</h2>
      ${data("feeds").map(f => feedRow(f.n, f.what + (f.note ? " · " + f.note : ""), f.status, f.last)).join("")}
    </div>
    ${rd.length ? `<div class="card"><h2>Latest official readings</h2>${readingsHtml(rd)}</div>` : ""}
    <div class="card"><h2>What the risk levels use today</h2>
      <ul class="steps">
        <li>${fc.length ? `Official rain forecasts for ${fc.map(z => settings().climate[z].n).join(", ")}; typical rain for ${MONTHS[NOW.getMonth()]} elsewhere.` : `Typical rain for ${MONTHS[NOW.getMonth()]} in each area.`}</li>
        <li>Official dam status where an agency or editor has set it; otherwise the usual pattern of releases for this time of year.</li>
        <li>${data("events").length} past floods from news and agency reports, each with its source.</li>
        <li>How many people live in each area and how easily they are hurt by floods.</li>
      </ul>
      <p class="small muted">Locations are approximate centres of the areas named in reports. Open Tracker is an open-source project and does not replace official warnings.</p>
    </div>
    <div class="card"><h2>Map and data credits</h2><p class="small">Boundaries, rivers and lakes: Natural Earth (public domain). Map engine: MapLibre (BSD). Flood reports: NADMO, NEMA, LASEMA, NIHSA, Ghana News Agency, Citi Newsroom, MyJoyOnline, Graphic, TheCable, AP and others, linked beside each flood.</p></div>
    <div class="card"><h2>Privacy</h2><p class="small">Open Tracker counts visits, pages and searches to see what people need. It stores no names, asks for no location, and counts nothing on devices set to “Do Not Track”.</p></div>`;
}

/* ---- ui/views-expert.js ---- */
/* ===== Expert mode: full filters, 3D map, ranked table, model inputs ===== */
function exCtx() {
  const e = UI.ex;
  return {month: +e.month, horizon: e.horizon, rain: e.rain === "mm" ? "mm" : "auto", mm: +e.mm, tide: e.tide, dams: e.dams};
}
function exHot() {
  const e = UI.ex;
  const ctx = exCtx();
  return IX.hot.filter(h => (e.country === "ALL" || h.c === e.country) && (!e.area || h.r === e.area) && (h.d || []).some(d =>
      (d === "rain" && e.types.rain) || (d === "river" && e.types.river) || (d === "coast" && e.types.coast) || (IX.damById[d] && e.types.dam)))
    .map(h => ({h, r: computeRisk(h, ctx)}))
    .filter(x => LVL_RANK[x.r.level] >= LVL_RANK[e.minLevel])
    .sort((a, b) => b.r.score - a.r.score);
}
function pct(x) { return Math.round(x * 100) + "%"; }

function viewExpert() {
  const e = UI.ex, st = settings();
  const rows = exHot();
  const areas = FT.areas.filter(a => e.country === "ALL" || a.c === e.country);
  const dams = data("dams");
  const sel = (id, label, opts, val) => `<label class="field"><span>${label}</span><select id="${id}" data-ex="${id}">${opts.map(([v, n]) => `<option value="${esc(v)}" ${String(val) === String(v) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  const counts = LEVELS.map(l => [l, rows.filter(x => x.r.level === l.k).length]);
  return `
  <div class="split">
    <aside class="panel card" aria-label="Expert filters">
      <h2>Filters and inputs</h2>
      <p class="small muted">Changes here only affect your own view. The public sees the official settings set by an editor.</p>
      ${sel("country", "Country", [["ALL", "Ghana and Nigeria"], ["GH", "Ghana"], ["NG", "Nigeria"]], e.country)}
      ${sel("area", "Region or state", [["", "All"], ...areas.map(a => [a.id, `${a.n} (${a.c === "GH" ? "region" : "state"})`])], e.area)}
      ${sel("horizon", "Forecast horizon", [["today", "Today"], ["3d", "Next 3 days"], ["season", "Next 3 months"], ["year", "Next rainy season (" + outlookSettings().year + ")"]], e.horizon)}
      ${sel("month", "Month (to test other seasons)", MONTHS.map((m, i) => [i, m + (i === NOW.getMonth() ? " (this month)" : "")]), e.month)}
      ${sel("rain", "Rain input", [["auto", "Typical weather, or official forecast if entered"], ["mm", "Set a rain amount"]], e.rain)}
      ${e.rain === "mm" ? `<label class="field"><span>Rain over 3 days: <b class="num">${e.mm} mm</b> (29 June 2026 in Accra was about 140 mm in one storm)</span><input type="range" id="mm" data-ex="mm" min="0" max="300" step="5" value="${e.mm}"></label>` : ""}
      ${sel("tide", "Tide at lagoon mouths", [["normal", "Normal"], ["spring", "Very high (spring tide)"]], e.tide)}
      <fieldset class="field" style="border:0;padding:0;margin:0"><span>Dam status (scenario)</span>
        ${dams.map(d => `<label class="field"><span>${esc(d.n)}</span><select data-dam="${esc(d.id)}">${[["", `Use official setting (${FT.damStatus[damState(d).status]?.n || "Typical"})`], ...Object.entries(FT.damStatus).map(([k, v]) => [k, v.n])].map(([v, n]) => `<option value="${v}" ${(e.dams[d.id] || "") === v ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`).join("")}
      </fieldset>
      <fieldset class="field" style="border:0;padding:0;margin:0"><span>Flood types</span><div class="checks">
        ${[["rain", "Heavy rain"], ["river", "River"], ["dam", "Dam release"], ["coast", "Coast and tide"]].map(([k, n]) => `<label><input type="checkbox" data-type="${k}" ${e.types[k] ? "checked" : ""}> ${n}</label>`).join("")}
      </div></fieldset>
      ${sel("minLevel", "Show from level", LEVELS.map(l => [l.k, l.n + (l.k === "low" ? " (all)" : " and above")]), e.minLevel)}
      <button class="sbtn" data-act="ex-reset">Reset to official settings</button>
    </aside>
    <section class="panel">
      <div class="card">
        <h2>${rows.length} flood area${rows.length === 1 ? "" : "s"} · ${HORIZONS.find(h => h.k === e.horizon).n.toLowerCase()} · ${MONTHS[e.month]}</h2>
        <div class="legend">${counts.map(([l, n]) => `<span class="lv-${l.k}">${icon(l.k, 18)}${l.n}: <b class="num">${n}</b></span>`).join("")}</div>
      </div>
      <div class="mapbox tall" id="mapbox"><div id="map" role="region" aria-label="3D flood risk map"></div>
        <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button><button class="wide" data-act="three" aria-pressed="${UI.three}">${UI.three ? "Flat map" : "3D columns"}</button></div>
        <div class="mapattr">Columns: height = risk score · Map data: Natural Earth · MapLibre</div>
      </div>
      <div class="legend">${LEVELS.map(l => `<span class="lv-${l.k}">${icon(l.k, 18)}${l.n}</span>`).join("")}<span><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21l4-16h10l4 16z" fill="var(--accent)"/></svg>Dam</span></div>
      <div class="tablewrap"><table>
        <thead><tr><th>Area</th><th>Region / state</th><th>Level</th><th class="n">Chance of flooding</th><th class="n">Rain</th><th class="n">Dam</th><th class="n">River</th><th class="n">People</th><th class="n">Vulnerability</th><th class="n">Past floods</th><th class="n">Score</th></tr></thead>
        <tbody>${rows.map(({h, r}) => `<tr class="clickable" data-act="ex-focus" data-id="${h.id}" tabindex="0"><td><b>${esc(h.n)}</b></td><td>${esc(IX.areaById[h.r]?.n || h.r)}</td><td>${chip(r.level)}</td><td class="n">${pct(r.P)}</td><td class="n">${pct(r.Prain)}</td><td class="n">${pct(r.Pdam)}</td><td class="n">${pct(r.Priver)}</td><td class="n">${r.E.toFixed(2)}</td><td class="n">${r.V.toFixed(2)}</td><td class="n">${r.nEvents}</td><td class="n">${r.score.toFixed(2)}</td></tr>`).join("") || `<tr><td colspan="11">No areas match these filters.</td></tr>`}</tbody>
      </table></div>
      <div class="grid2">
        <div class="card"><h2>How the forecast model works</h2>
          <div class="formula">score = P × (${st.wE}·E + ${st.wV}·V) × (1 + ${st.wH}·H)</div>
          <ul class="steps small">
            <li><b>P</b>, chance of flooding = 1 − (1 − rain) × (1 − dam) × (1 − river).</li>
            <li><b>Rain</b>: with a rain amount (official forecast or your scenario), chance rises steeply past the rain that usually starts flooding in that area. Without one, it uses the chance of a heavy-rain day from typical rain for the month.</li>
            <li><b>Dam</b>: the dam's official status, or its usual release pattern for the month.</li>
            <li><b>E</b> people exposed, <b>V</b> how easily people are hurt, <b>H</b> past floods (4 or more = 1).</li>
            <li>Levels: Medium from ${st.cut.med}, High from ${st.cut.high}, Very high from ${st.cut.vhigh}.</li>
            <li>Tides cut the rain needed to flood lagoon areas by 15% (normal) or 30% (very high).</li>
          </ul>
          <p class="small muted">This is a screening model. The full 2D flood simulation in the design plan replaces it as data arrives.</p>
        </div>
        <div class="card"><h2>Official data status</h2>
          ${data("feeds").map(f => `<div class="feed"><div><b>${esc(f.n)}</b><br><span class="small muted">${esc(f.what)}</span></div><span class="status ${f.status === "on" ? "on" : f.status === "manual" ? "manual" : "off"}">${f.status === "on" ? "Connected" : f.status === "manual" ? "Entered by staff" : "Not connected yet"}</span></div>`).join("")}
          <p class="small muted">When a feed connects, its readings replace the typical-weather inputs automatically.</p>
        </div>
      </div>
    </section>
  </div>`;
}

/* ---- ui/views-admin.js ---- */
/* ===== Admin: editors can add, correct, replace and delete every record ===== */
const C_OPTS = [["GH", "Ghana"], ["NG", "Nigeria"]];
const C_OPTS_ALL = [["ALL", "Both countries"], ...C_OPTS];
const SCHEMA = {
  alerts: {title: "Official warnings", one: "warning", help: "Post warnings from NADMO, NEMA, LASEMA, GMet or NiMet. They appear at the top of every matching public page until they expire.",
    cols: [["level", "Type"], ["agency", "Agency"], ["msg", "Message"], ["expires", "Until"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "level", l: "Type", t: "select", opts: [["warning", "Flood warning (red)"], ["watch", "Flood watch (amber)"], ["info", "Notice (blue)"]]},
      {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "areas", l: "Regions or states (IDs, comma separated; blank = whole country)", t: "list", hint: "areas"},
      {k: "agency", l: "Agency", t: "text"}, {k: "msg", l: "Message (plain words)", t: "textarea", wide: true},
      {k: "issued", l: "Issued", t: "datetime"}, {k: "expires", l: "Expires", t: "datetime"}]},
  forecasts: {title: "Rain forecasts", one: "forecast", help: "Type rain forecasts from GMet or NiMet bulletins until the live feed is connected. A forecast is used for 36 hours after its issue time.",
    cols: [["zone", "Weather zone"], ["mm24", "Next 24 h (mm)"], ["mm72", "Next 3 days (mm)"], ["src", "Source"], ["at", "Issued"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "zone", l: "Weather zone", t: "select", opts: () => Object.entries(settings().climate).map(([k, v]) => [k, v.n])},
      {k: "mm24", l: "Rain next 24 hours (mm)", t: "number"}, {k: "mm72", l: "Rain next 3 days (mm)", t: "number"},
      {k: "src", l: "Source (e.g. GMet bulletin 06:00)", t: "text"}, {k: "at", l: "Issued", t: "datetime"}]},
  dams: {title: "Dams", one: "dam", help: "Set each dam's official status from the operator's notice. 'Typical for the season' uses the usual monthly pattern below.",
    cols: [["n", "Dam"], ["river", "River"], ["status", "Status"], ["lastNotice", "Latest notice"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text"}, {k: "river", l: "River", t: "text"}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "status", l: "Official status", t: "select", opts: () => Object.entries(FT.damStatus).map(([k, v]) => [k, v.n])},
      {k: "lastNotice", l: "Latest notice shown to the public", t: "text", wide: true}, {k: "op", l: "Operator", t: "text"},
      {k: "ll", l: "Location", t: "ll"}, {k: "note", l: "Background note", t: "textarea", wide: true},
      {k: "season", l: "Usual chance of releases by month (0 to 1)", t: "monthly", wide: true}]},
  hotspots: {title: "Flood areas", one: "flood area", help: "Every area people can search and see on the map.",
    cols: [["n", "Name"], ["r", "Region / state"], ["d", "Causes"], ["t", "Rain to flood (mm)"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text"}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "r", l: "Region or state", t: "select", opts: () => FT.areas.map(a => [a.id, `${a.n} (${a.c})`])}, {k: "ll", l: "Location", t: "ll"},
      {k: "d", l: "Causes", t: "drivers", wide: true}, {k: "z", l: "Weather zone", t: "select", opts: () => Object.entries(settings().climate).map(([k, v]) => [k, v.n])},
      {k: "t", l: "Rain over 3 days that usually starts flooding (mm)", t: "number"}, {k: "sev", l: "How bad floods get (1 to 3)", t: "number"},
      {k: "exp", l: "People exposed (1 to 3)", t: "number"}, {k: "vul", l: "Vulnerability (0 to 1)", t: "number"},
      {k: "aka", l: "Other names people search for (comma separated)", t: "list", wide: true}, {k: "why", l: "Plain-language reason shown to the public", t: "textarea", wide: true}]},
  events: {title: "Past floods", one: "past flood", help: "Floods linked to named areas. Add the source link so people can check it.",
    cols: [["date", "Date"], ["t", "Title"], ["ids", "Areas"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "t", l: "Title", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS},
      {k: "date", l: "Date (YYYY-MM-DD, YYYY-MM or YYYY)", t: "text"}, {k: "year", l: "Year (blank if not confirmed)", t: "number"},
      {k: "ids", l: "Flood area IDs (comma separated)", t: "list", wide: true, hint: "hot"}, {k: "impact", l: "What happened", t: "textarea", wide: true},
      {k: "src", l: "Source link", t: "text", wide: true}]},
  regionEvents: {title: "Region reports", one: "region report", help: "Floods reported for a whole region or state without named places.",
    cols: [["date", "Date"], ["r", "Region / state"], ["t", "Title"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "r", l: "Region or state", t: "select", opts: () => FT.areas.map(a => [a.id, `${a.n} (${a.c})`])},
      {k: "t", l: "Title", t: "text"}, {k: "date", l: "Date", t: "text"}, {k: "year", l: "Year", t: "number"},
      {k: "impact", l: "What happened", t: "textarea", wide: true}, {k: "src", l: "Source link", t: "text", wide: true}]},
  safe: {title: "Safe places", one: "safe place", help: "Shelters and safe havens named by NADMO, AMA, NEMA or LASEMA.",
    cols: [["n", "Name"], ["c", "Country"], ["src", "Named by"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "ll", l: "Location", t: "ll"}, {k: "src", l: "Named by", t: "text"}]},
  roads: {title: "Roads to avoid", one: "road", help: "Roads reported impassable in floods.",
    cols: [["n", "Road"], ["c", "Country"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Road", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "ll", l: "Location", t: "ll"}]},
  feeds: {title: "Data feeds", one: "feed", help: "Mark a feed 'Entered by staff' while you type its data in, and 'Connected' once it flows automatically.",
    cols: [["n", "Feed"], ["c", "Country"], ["status", "Status"], ["last", "Last update"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "what", l: "What it provides", t: "text", wide: true},
      {k: "status", l: "Status", t: "select", opts: [["off", "Not connected yet"], ["manual", "Entered by staff"], ["on", "Connected"]]}, {k: "last", l: "Last update", t: "datetime"}, {k: "note", l: "Note shown to the public", t: "text", wide: true}]},
  agencies: {title: "Agencies", one: "agency", help: "Agencies in Ghana, Nigeria and future countries. Link their staff under People or approve their requests; their posts then appear publicly.",
    cols: [["n", "Agency"], ["c", "Country"], ["kind", "Type"], ["status", "Status"], ["publishers", "Linked staff"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "n", l: "Name", t: "text", wide: true}, {k: "c", l: "Country code (GH, NG, or another ISO code such as CI, TG, BJ, SN)", t: "text"},
      {k: "kind", l: "Type", t: "select", opts: [["met", "Weather service"], ["hydro", "River and hydrology"], ["disaster", "Disaster and emergency"], ["dam", "Dam operator"], ["gov", "Ministry or assembly"], ["other", "Other"]]},
      {k: "status", l: "Status", t: "select", opts: [["active", "Active"], ["suspended", "Suspended (posts hidden)"]]},
      {k: "push", l: "May send public notifications", t: "select", opts: [["true", "Yes"], ["false", "No"]]},
      {k: "supplies", l: "What they supply", t: "text", wide: true}, {k: "web", l: "Website", t: "text", wide: true}]},
  notifications: {title: "Public notifications", one: "notification",
    help: "Send credible, official information to the public. It appears at once in everyone's Alerts and, on the Open Tracker web app, as a phone notification for people who follow the places it covers.",
    cols: [["title", "Title"], ["agency", "From"], ["level", "Type"], ["areas", "Where"], ["at", "Sent"], ["expires", "Until"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "level", l: "Type", t: "select", opts: NOTICE_LEVELS}, {k: "agency", l: "Sent on behalf of", t: "select", opts: () => noticeSenders()},
      {k: "title", l: "Title (short, up to 80 characters)", t: "text", wide: true}, {k: "msg", l: "Message in plain words (up to 500 characters)", t: "textarea", wide: true},
      {k: "c", l: "Country", t: "select", opts: C_OPTS_ALL}, {k: "areas", l: "Regions or states (IDs, comma separated; blank = whole country)", t: "list", hint: "areas", wide: true},
      {k: "lat", l: "Or near a spot: latitude", t: "number"}, {k: "lon", l: "Longitude", t: "number"}, {k: "km", l: "Radius (km, 1 to 300)", t: "number"},
      {k: "at", l: "Sent", t: "datetime"}, {k: "expires", l: "Show until", t: "datetime"}]},
  contacts: {title: "Emergency numbers", one: "number", help: "Numbers shown on every answer page for that country.",
    cols: [["c", "Country"], ["n", "Name"], ["num", "Number"]],
    fields: [{k: "id", l: "ID", t: "id"}, {k: "c", l: "Country", t: "select", opts: C_OPTS}, {k: "n", l: "Name", t: "text"}, {k: "num", l: "Number", t: "text"}]}
};
/* tabs, with the permission each needs */
const TABS = [
  ["overview", "Overview", () => AUTH.anyAdmin()],
  ["analytics", "Analytics", () => AUTH.can("analytics.view")],
  ["approvals", "Approvals", () => AUTH.can("approvals.manage")],
  ["contributions", "Contributions", () => AUTH.can("contributions.review")],
  ["replays", "Flood replays", () => AUTH.can("data.edit")],
  ["live", "Live data", () => AUTH.can("data.edit")],
  ["notifications", "Send notification", () => AUTH.can("notify.send")],
  ["alerts", "Warnings", () => AUTH.can("warnings.manage")],
  ["forecasts", "Rain forecasts", () => AUTH.can("forecasts.manage")],
  ["dams", "Dams", () => AUTH.can("forecasts.manage")],
  ["hotspots", "Flood areas", () => AUTH.can("data.edit")],
  ["events", "Past floods", () => AUTH.can("data.edit")],
  ["regionEvents", "Region reports", () => AUTH.can("data.edit")],
  ["safe", "Safe places", () => AUTH.can("data.edit")],
  ["roads", "Roads", () => AUTH.can("data.edit")],
  ["feeds", "Data feeds", () => AUTH.can("data.edit")],
  ["contacts", "Emergency numbers", () => AUTH.can("data.edit")],
  ["agencies", "Agencies", () => AUTH.can("agencies.manage")],
  ["requests", "Access requests", () => AUTH.can("agencies.manage")],
  ["posts", "Agency posts", () => AUTH.can("agencies.manage") || AUTH.can("warnings.manage")],
  ["people", "People", () => AUTH.can("users.manage")],
  ["roles", "Roles", () => AUTH.can("users.manage")],
  ["model", "Model settings", () => AUTH.can("model.manage")],
  ["audit", "Audit log", () => AUTH.can("audit.view")]
];
function noticeSenders() {
  const own = AUTH.agency();
  if (own && !AUTH.can("users.manage")) return [[own.id, own.n]];
  return [["opentracker", "Open Tracker team"]].concat(agencies().filter(a => a.status !== "suspended" && a.push !== false).map(a => [a.id, a.n]));
}
const tabLabel = k => (TABS.find(t => t[0] === k) || [k, k])[1];

/* names are resolved at render time and never stored */
const NAMES = {map: {}, pending: false};
function nameOf(uid) { return uid === DB.uid ? "You" : NAMES.map[uid] || "Unnamed person"; }
async function ensureNames(ids) {
  const miss = [...new Set(ids.filter(id => id && !(id in NAMES.map)))];
  if (!miss.length || !DB.user || NAMES.pending) return;
  NAMES.pending = true;
  try { const ps = await DB.user.profiles(miss); miss.forEach(id => NAMES.map[id] = ps[id]?.name || ""); } catch (e) { miss.forEach(id => NAMES.map[id] = ""); }
  NAMES.pending = false;
  if (UI.mode === "admin") render();
}

function viewAdmin() {
  const a = UI.admin;
  if (!DB.api) return `<h1>Admin</h1><div class="notice">${ICON.info}<div><b>Editing needs the shared database</b>Open the Open Tracker page signed in to claude.ai to manage its data.</div></div>`;
  const tabs = TABS.filter(t => t[2]());
  if (!tabs.length) return `<h1>Admin</h1><div class="notice">${ICON.info}<div><b>You don't have an admin role</b>Ask an Open Tracker administrator to give you one.</div></div>`;
  if (!tabs.some(t => t[0] === a.tab)) a.tab = tabs[0][0];
  const waiting = AUTH.can("approvals.manage") ? APPROVAL.pendingPosts().length + APPROVAL.pendingChanges().length : 0;
  const nav = `<nav class="tabs" aria-label="Admin sections">${tabs.map(([k, n]) => `<button data-act="ad-tab" data-k="${k}" aria-pressed="${a.tab === k}">${n}${k === "approvals" && waiting ? ` <span class="badge">${waiting}</span>` : ""}</button>`).join("")}</nav>`;
  let body;
  if (!DB.cfg && !["overview", "analytics", "contributions"].includes(a.tab)) body = `<div class="notice">${ICON.info}<div><b>Set up the database first</b>Go to Overview and load the starting data.</div></div>`;
  else body = ({overview: adOverview, approvals: adApprovals, contributions: adContributions, replays: adReplays, live: adLive, analytics: adAnalytics, model: adModel, audit: adAudit, people: adPeople, roles: adRoles, requests: adRequests, posts: adPosts}[a.tab] || (() => adCollection(a.tab)))();
  return `<h1>Admin</h1><p class="muted">Signed in as <b>${esc(AUTH.label() || "editor")}</b>. Every change is saved straight away and recorded in the audit log.</p>${nav}${body}`;
}
function confirmBox() {
  const c = UI.admin.confirm;
  return c ? `<div class="confirm" role="alert"><b>${esc(c.msg)}</b><div class="toolbar"><button class="sbtn danger" type="button" data-act="ad-yes">${esc(c.yes)}</button><button class="sbtn" type="button" data-act="ad-no">Cancel</button></div></div>` : "";
}

/* live flood and heat data from the Open Tracker website's data feeds */
function adLive() {
  const w = hazardsDoc("world");
  const n = w ? Object.keys(w.countries).length : 0;
  return `<div class="card"><h2>Live flood and heat data</h2>
    <p>The Open Tracker website reads forecasts, river flow, official warnings and satellite scenes for every country around the clock. This page can't reach other sites, so bring that data here as a file:</p>
    <ol class="steps"><li>On the website, open the push console (<code>/console.html</code>) as an administrator and choose <b>Download live data</b>.</li><li>Import the file here. Every country's heat and flood reach updates for everyone.</li></ol>
    <p class="small muted">${w === undefined ? "Checking…" : w ? `Now showing data for ${n} countr${n === 1 ? "y" : "ies"}. ${esc(hazardsUpdated(w))}.` : "No live data imported yet."}</p>
    <label class="sbtn primary" for="hz-import">Import live data file</label><input id="hz-import" type="file" accept="application/json,.json" class="sr">
    <p id="hz-msg" role="status"></p></div>`;
}
async function liveImport(file) {
  const m = $("#hz-msg");
  try { const r = await importSnapshot(file); toast(`Imported live data for ${r.countries} countries.`); render(); }
  catch (e) { if (m) { m.textContent = e.message; m.className = "small err"; } }
}

function adOverview() {
  const rows = COLLS.filter(k => k !== "members" || AUTH.can("users.manage")).map(k => [tabLabel(k), data(k).length]);
  const reqs = AG.requests.length, publishers = Object.keys(publisherMap()).length;
  const waiting = AUTH.can("approvals.manage") ? APPROVAL.pendingPosts().length + APPROVAL.pendingChanges().length : 0;
  return `
  ${waiting ? `<div class="notice">${ICON.info}<div><b>${waiting} agency item${waiting === 1 ? " is" : "s are"} waiting for approval</b><button class="sbtn primary" data-act="ad-tab" data-k="approvals">Review now</button></div></div>` : ""}
  ${myChangesHtml()}
  <div class="grid2">
    <div class="card"><h2>Data source</h2>
      <p>${DB.cfg ? "Public pages show the shared database. Changes reach everyone signed in within seconds." : "The database is empty, so public pages show Open Tracker's built-in starting data."}</p>
      <div class="kv">${rows.map(([n, c]) => `<span>${esc(n)}</span><b class="num">${c}</b>`).join("")}<span>Linked agency staff</span><b class="num">${publishers}</b>${AUTH.can("agencies.manage") ? `<span>Access requests waiting</span><b class="num">${reqs}</b>` : ""}</div>
      ${!DB.cfg && (AUTH.isOwner || AUTH.can("backup.manage")) ? `<button class="sbtn primary" data-act="ad-seed">Set up the database with the starting data</button>` : ""}
    </div>
    ${AUTH.can("backup.manage") ? `<div class="card"><h2>Back up and restore</h2>
      <p class="small">Download everything as one file, or replace all data from a backup.</p>
      <div class="toolbar"><button class="sbtn" data-act="ad-export">Download backup</button><label class="sbtn" for="ad-import" style="display:inline-flex;align-items:center">Restore from file</label><input id="ad-import" type="file" accept="application/json,.json" class="sr"></div>
      ${DB.cfg ? `<button class="sbtn danger" data-act="ad-ask" data-k="reset">Reset all data to the starting data</button>` : ""}
      ${confirmBox()}
    </div>` : ""}
    <div class="card"><h2>Quick actions</h2><div class="toolbar">
      ${AUTH.can("notify.send") ? `<button class="sbtn primary" data-act="ad-new" data-k="notifications">Send a public notification</button>` : ""}
      ${AUTH.can("warnings.manage") ? `<button class="sbtn primary" data-act="ad-new" data-k="alerts">Post a warning</button>` : ""}
      ${AUTH.can("forecasts.manage") ? `<button class="sbtn" data-act="ad-new" data-k="forecasts">Enter a rain forecast</button><button class="sbtn" data-act="ad-tab" data-k="dams">Update a dam</button>` : ""}
      ${AUTH.can("data.edit") ? `<button class="sbtn" data-act="ad-new" data-k="events">Record a flood</button>` : ""}
      ${AUTH.can("users.manage") ? `<button class="sbtn" data-act="ad-tab" data-k="people">Add a person</button>` : ""}
      ${AUTH.can("agencies.manage") ? `<button class="sbtn" data-act="ad-new" data-k="agencies">Add an agency</button>` : ""}
    </div></div>
  </div>`;
}

function fmtCell(k, v) {
  if (v == null || v === "") return "—";
  if (k === "publishers") return String((v || []).length);
  if (Array.isArray(v)) return esc(v.join(", "));
  if (k === "status") return esc(FT.damStatus[v]?.n || {off: "Not connected yet", manual: "Entered by staff", on: "Connected", active: "Active", suspended: "Suspended"}[v] || v);
  if (k === "r") return esc(IX.areaById[v]?.n || v);
  if (["expires", "issued", "at", "last"].includes(k)) return esc(fmtDate(v));
  if (k === "zone") return esc(settings().climate[v]?.n || v);
  if (k === "level") return esc((NOTICE_LEVELS.find(l => l[0] === v) || [0, {warning: "Flood warning", watch: "Flood watch", info: "Notice"}[v] || v])[1]);
  if (k === "agency" && agencies().some(a => a.id === v)) return esc(agencies().find(a => a.id === v).n);
  if (k === "push") return v === false ? "No" : "Yes";
  const s = String(v); return esc(s.length > 70 ? s.slice(0, 70) + "…" : s);
}

function adCollection(key) {
  const sc = SCHEMA[key], a = UI.admin;
  if (!sc) return "";
  if (a.edit && a.edit.coll === key) return adForm(key);
  const q = norm(a.q);
  const rows = data(key).filter(r => !q || norm(JSON.stringify(r)).includes(q)).sort((x, y) => String(x[sc.cols[0][0]] ?? "").localeCompare(String(y[sc.cols[0][0]] ?? "")));
  const del = canDelete(key);
  return `
  <div class="card">
    <h2>${esc(sc.title)}</h2><p class="small muted">${esc(sc.help)}</p>
    ${APPROVAL.gate() ? `<div class="notice info">${ICON.info}<div>Changes you make here are sent to an administrator and go live once approved. Follow them under Overview.</div></div>` : ""}
    <div class="toolbar"><input id="ad-q" type="search" placeholder="Search ${esc(sc.title.toLowerCase())}" value="${esc(a.q)}" aria-label="Search ${esc(sc.title)}"><button class="sbtn primary" data-act="ad-new" data-k="${key}">Add ${esc(sc.one)}</button></div>
    ${a.confirm?.coll === key ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr>${sc.cols.map(c => `<th>${esc(c[1])}</th>`).join("")}<th>Actions</th></tr></thead><tbody>
      ${rows.map(r => `<tr>${sc.cols.map(([k]) => `<td>${fmtCell(k, r[k])}</td>`).join("")}<td style="white-space:nowrap"><button class="sbtn" data-act="ad-edit" data-k="${key}" data-id="${esc(r.id)}">Edit</button>${del ? ` <button class="sbtn danger" data-act="ad-ask" data-k="del" data-coll="${key}" data-id="${esc(r.id)}">Delete</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="${sc.cols.length + 1}">Nothing here yet.</td></tr>`}
    </tbody></table></div>
    <p class="small muted">${rows.length} shown.</p>
  </div>`;
}

function fieldHtml(f, v) {
  const id = "f-" + f.k, lab = `<span>${esc(f.l)}</span>`, wide = f.wide ? " wide" : "";
  if (f.t === "id") {
    const isNew = UI.admin.edit.isNew;
    return `<label class="field"><span>${esc(f.l)}${isNew ? " (letters, numbers, dashes)" : " (fixed)"}</span><input id="${id}" value="${esc(v ?? "")}" ${isNew ? "" : "readonly"} required></label>`;
  }
  if (f.t === "select") {
    const opts = typeof f.opts === "function" ? f.opts() : f.opts;
    return `<label class="field${wide}">${lab}<select id="${id}">${opts.map(([o, n]) => `<option value="${esc(o)}" ${String(v ?? "") === String(o) ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>`;
  }
  if (f.t === "textarea") return `<label class="field${wide}">${lab}<textarea id="${id}">${esc(v ?? "")}</textarea></label>`;
  if (f.t === "number") return `<label class="field${wide}">${lab}<input id="${id}" type="number" step="any" value="${esc(v ?? "")}"></label>`;
  if (f.t === "datetime") {
    let val = ""; if (v) { const d = new Date(v); if (!isNaN(d)) val = localDT(d.getTime()); }
    return `<label class="field${wide}">${lab}<input id="${id}" type="datetime-local" value="${val}"></label>`;
  }
  if (f.t === "list") {
    const hint = f.hint === "areas" ? `For example: ${FT.areas.slice(0, 3).map(a => a.id).join(", ")}` : f.hint === "hot" ? `For example: ${IX.hot.slice(0, 3).map(h => h.id).join(", ")}` : "";
    return `<label class="field${wide}">${lab}<input id="${id}" value="${esc((v || []).join(", "))}">${hint ? `<span class="small muted">${esc(hint)}</span>` : ""}</label>`;
  }
  if (f.t === "ll") {
    const ll = v || [0, 0];
    return `<div class="field"><span>${esc(f.l)} (latitude, longitude)</span><div class="row" style="gap:6px"><input id="f-lat" type="number" step="any" value="${esc(ll[1])}" aria-label="Latitude"><input id="f-lon" type="number" step="any" value="${esc(ll[0])}" aria-label="Longitude"></div></div>`;
  }
  if (f.t === "drivers") {
    const d = v || [];
    const opts = [["rain", "Heavy rain"], ["river", "River"], ["coast", "Coast and tide"], ...data("dams").map(x => [x.id, x.n])];
    return `<fieldset class="field wide" style="border:0;padding:0;margin:0"><span>${esc(f.l)}</span><div class="checks">${opts.map(([k, n]) => `<label><input type="checkbox" data-drv="${esc(k)}" ${d.includes(k) ? "checked" : ""}> ${esc(n)}</label>`).join("")}</div></fieldset>`;
  }
  if (f.t === "monthly") {
    const m = v || Array(12).fill(0);
    return `<div class="field wide"><span>${esc(f.l)}</span><div class="tablewrap"><table class="mtable"><tr>${MONTHS.map(x => `<th>${x.slice(0, 3)}</th>`).join("")}</tr><tr>${m.map((x, i) => `<td><input data-mon="${i}" type="number" step="any" value="${esc(x)}" aria-label="${MONTHS[i]}"></td>`).join("")}</tr></table></div></div>`;
  }
  return `<label class="field${wide}">${lab}<input id="${id}" value="${esc(v ?? "")}"></label>`;
}

function adForm(key) {
  const sc = SCHEMA[key], e = UI.admin.edit;
  return `
  <form class="card" id="ad-form" data-coll="${key}" novalidate>
    <h2>${e.isNew ? "Add " : "Edit "}${esc(sc.one)}</h2>
    <div class="formgrid">${sc.fields.map(f => fieldHtml(f, e.rec[f.k])).join("")}</div>
    <p class="small" id="ad-err" role="alert" style="color:var(--vhigh)"></p>
    <div class="toolbar"><button class="sbtn primary" type="submit">Save</button><button class="sbtn" type="button" data-act="ad-cancel">Cancel</button>${!e.isNew && canDelete(key) ? `<button class="sbtn danger" type="button" data-act="ad-ask" data-k="del" data-coll="${key}" data-id="${esc(e.rec.id)}">Delete</button>` : ""}</div>
    ${UI.admin.confirm?.coll === key ? confirmBox() : ""}
  </form>`;
}

const ID_RE = /^[A-Za-z0-9_\-]{1,60}$/;
function readForm(key, form) {
  const sc = SCHEMA[key], old = UI.admin.edit.rec, out = clone(old);
  for (const f of sc.fields) {
    if (f.t === "ll") {
      const lat = parseFloat(form.querySelector("#f-lat").value), lon = parseFloat(form.querySelector("#f-lon").value);
      if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("Enter a valid latitude (−90 to 90) and longitude (−180 to 180).");
      out.ll = [lon, lat]; continue;
    }
    if (f.t === "drivers") { out.d = [...form.querySelectorAll("[data-drv]")].filter(x => x.checked).map(x => x.dataset.drv); if (!out.d.length) throw new Error("Choose at least one cause."); continue; }
    if (f.t === "monthly") { out[f.k] = [...form.querySelectorAll("[data-mon]")].map(x => Math.max(0, Math.min(1, parseFloat(x.value) || 0))); continue; }
    const el = form.querySelector("#f-" + f.k); if (!el) continue;
    let v = el.value;
    if (f.t === "id") {
      v = v.trim();
      if (!ID_RE.test(v)) throw new Error("The ID can use letters, numbers, dashes and underscores only (up to 60).");
      if (UI.admin.edit.isNew && data(key).some(r => r.id === v)) throw new Error("That ID is already used. Choose another.");
    }
    if (f.t === "number") { v = v.trim() === "" ? null : Number(v); if (v !== null && !isFinite(v)) throw new Error(`${f.l}: enter a number.`); }
    if (f.t === "list") v = v.split(",").map(s => s.trim()).filter(Boolean).slice(0, 200);
    if (f.t === "datetime") v = v ? new Date(v).toISOString() : "";
    if (typeof v === "string") v = v.slice(0, 4000);
    out[f.k] = v;
  }
  if (key === "forecasts") { if (!out.id) out.id = out.zone; if (!(out.mm24 >= 0 && out.mm72 >= 0)) throw new Error("Enter both rain amounts (0 or more)."); }
  if (key === "hotspots") {
    if (!IX.areaById[out.r] || IX.areaById[out.r].c !== out.c) throw new Error("The region or state must be in the chosen country.");
    for (const [k, lo, hi] of [["t", 5, 1000], ["sev", 1, 3], ["exp", 1, 3], ["vul", 0, 1]]) if (!(out[k] >= lo && out[k] <= hi)) throw new Error(`Check “${sc.fields.find(f => f.k === k).l}”: it must be between ${lo} and ${hi}.`);
  }
  if (key === "events") {
    const bad = (out.ids || []).filter(id => !IX.byId[id]);
    if (bad.length) throw new Error("Unknown flood area IDs: " + bad.join(", "));
    if (out.year != null && !(out.year >= 1900 && out.year <= 2100)) throw new Error("Enter a year between 1900 and 2100, or leave it blank.");
  }
  if (key === "alerts") {
    if (!String(out.msg || "").trim()) throw new Error("Write the warning message.");
    const bad = (out.areas || []).filter(id => !IX.areaById[id]); if (bad.length) throw new Error("Unknown region or state IDs: " + bad.join(", "));
  }
  if (key === "agencies") { out.c = String(out.c || "").trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(out.c)) throw new Error("Enter a two-letter country code, such as GH or NG."); out.publishers = old.publishers || []; out.push = out.push !== "false"; }
  if (key === "agencies" && out.web && !safeUrl(out.web)) throw new Error("The website must start with http:// or https://");
  if (key === "notifications") {
    out.title = String(out.title || "").trim(); out.msg = String(out.msg || "").trim();
    if (!out.title || out.title.length > 80) throw new Error("Write a title of up to 80 characters.");
    if (!out.msg || out.msg.length > 500) throw new Error("Write a message of up to 500 characters.");
    if (!noticeSenders().some(s => s[0] === out.agency)) throw new Error("Choose who this is sent on behalf of.");
    const bad = (out.areas || []).filter(id => !IX.areaById[id] || (out.c !== "ALL" && IX.areaById[id].c !== out.c));
    if (bad.length) throw new Error("These regions or states aren't in the chosen country: " + bad.join(", "));
    const spot = [out.lat, out.lon, out.km].filter(v => v !== null && v !== undefined);
    if (spot.length && spot.length < 3) throw new Error("For a spot, enter latitude, longitude and radius, or leave all three blank.");
    if (spot.length) {
      if (Math.abs(out.lat) > 90 || Math.abs(out.lon) > 180 || !(out.km >= 1 && out.km <= 300)) throw new Error("Check the spot: latitude −90 to 90, longitude −180 to 180, radius 1 to 300 km.");
      out.ll = [out.lon, out.lat];
    } else out.ll = null;
    if (!out.at || (UI.admin.edit.isNew && Math.abs(Date.parse(out.at) - Date.now()) < 120e3)) out.at = new Date().toISOString();   /* exact send time */
    if (out.expires && Date.parse(out.expires) <= Date.parse(out.at)) throw new Error("“Show until” must be after the send time.");
  }
  if (key === "events" && out.src && !/^https?:\/\//.test(out.src)) throw new Error("The source link must start with http:// or https://");
  if (sc.fields.some(f => f.k === "n") && !String(out.n || "").trim()) throw new Error("Enter a name.");
  return out;
}

function adModel() {
  const st = settings(), z = Object.entries(st.climate);
  return `
  <form class="card" id="ad-model" novalidate>
    <h2>Model settings</h2>
    <p class="small muted">These change the risk levels everyone sees. Score = P × (wE·E + wV·V) × (1 + wH·H).</p>
    <div class="formgrid">
      <label class="field"><span>wE, weight of people exposed</span><input id="m-wE" type="number" step="0.05" value="${st.wE}"></label>
      <label class="field"><span>wV, weight of vulnerability</span><input id="m-wV" type="number" step="0.05" value="${st.wV}"></label>
      <label class="field"><span>wH, weight of past floods</span><input id="m-wH" type="number" step="0.05" value="${st.wH}"></label>
      <label class="field"><span>Heavy-rain tail (0.2 to 1.5; lower = more extreme days)</span><input id="m-tail" type="number" step="0.05" value="${st.tail}"></label>
      <label class="field"><span>Medium from score</span><input id="m-med" type="number" step="0.01" value="${st.cut.med}"></label>
      <label class="field"><span>High from score</span><input id="m-high" type="number" step="0.01" value="${st.cut.high}"></label>
      <label class="field"><span>Very high from score</span><input id="m-vhigh" type="number" step="0.01" value="${st.cut.vhigh}"></label>
      <label class="field"><span>Use official forecasts for (hours)</span><input id="m-fresh" type="number" step="1" value="${st.freshHours}"></label>
      <label class="field wide"><span>Message at the top of every public page (blank for none)</span><textarea id="m-notice">${esc(st.notice || "")}</textarea></label>
    </div>
    <h3>Typical monthly rain by weather zone (mm)</h3>
    <div class="tablewrap"><table class="mtable"><tr><th>Zone</th>${MONTHS.map(m => `<th>${m.slice(0, 3)}</th>`).join("")}</tr>
      ${z.map(([k, v]) => `<tr><td><input data-zn="${esc(k)}" value="${esc(v.n)}" style="width:170px;text-align:left" aria-label="Zone name"></td>${v.m.map((x, i) => `<td><input data-zone="${esc(k)}" data-mon="${i}" type="number" step="1" value="${esc(x)}" aria-label="${esc(v.n)} ${MONTHS[i]}"></td>`).join("")}</tr>`).join("")}
    </table></div>
    ${outlookFieldsHtml()}
    <p class="small" id="ad-err" role="alert" style="color:var(--vhigh)"></p>
    <div class="toolbar"><button class="sbtn primary" type="submit">Save model settings</button><button class="sbtn" type="button" data-act="ad-ask" data-k="model-reset">Restore default settings</button></div>
    ${UI.admin.confirm?.k === "model-reset" ? confirmBox() : ""}
  </form>`;
}
/* the rainy season outlook: year, ENSO and the official high-risk lists (one blank row adds a list) */
function outlookFieldsHtml() {
  const o = outlookSettings();
  const lists = (o.lists || []).concat([{id: "", n: "", boost: 1.3, src: "", areas: []}]);
  return `<h3>Rainy season outlook</h3>
    <p class="small muted">Update these when GMet, NiMet and NIHSA publish next year's outlooks (February to April). Areas on a list get their chance of flooding raised by its factor.</p>
    <div class="formgrid">
      <label class="field"><span>Outlook for the rainy season of</span><input id="o-year" type="number" step="1" value="${o.year}"></label>
      <label class="field"><span>Flood records count from</span><input id="o-start" type="number" step="1" value="${o.recordStart}"></label>
      <label class="field"><span>ENSO state expected</span><select id="o-enso">${Object.entries(ENSO).map(([k, v]) => `<option value="${k}" ${o.enso === k ? "selected" : ""}>${esc(v[1])}</option>`).join("")}</select></label>
      <label class="field wide"><span>ENSO note shown to the public</span><input id="o-enso-note" maxlength="400" value="${esc(o.ensoNote || "")}"></label>
    </div>
    ${lists.map((l, i) => `<fieldset class="card" style="margin-top:10px"><legend class="small">${l.n ? "Official list" : "Add a new official list"}</legend><div class="formgrid">
      <label class="field wide"><span>Name and date of the official outlook</span><input data-ol="n" data-i="${i}" maxlength="200" value="${esc(l.n)}"></label>
      <label class="field wide"><span>Regions or states on it (IDs, comma separated)</span><input data-ol="areas" data-i="${i}" value="${esc((l.areas || []).join(", "))}"></label>
      <label class="field"><span>Raise the chance by (1 to 3)</span><input data-ol="boost" data-i="${i}" type="number" step="0.05" value="${esc(l.boost)}"></label>
      <label class="field wide"><span>Source link</span><input data-ol="src" data-i="${i}" maxlength="500" value="${esc(l.src || "")}"></label>
    </div></fieldset>`).join("")}`;
}
function readOutlook(form) {
  const num = (id, name, lo, hi) => { const v = Number(form.querySelector(id).value); if (!Number.isInteger(v) || v < lo || v > hi) throw new Error(`${name} must be a whole number from ${lo} to ${hi}.`); return v; };
  const year = num("#o-year", "The outlook year", 2020, 2100), recordStart = num("#o-start", "The record start", 1950, year);
  const enso = form.querySelector("#o-enso").value;
  if (!ENSO[enso]) throw new Error("Choose an ENSO state.");
  const rows = {};
  form.querySelectorAll("[data-ol]").forEach(i => { (rows[i.dataset.i] = rows[i.dataset.i] || {})[i.dataset.ol] = i.value.trim(); });
  const lists = Object.values(rows).filter(r => r.n).map((r, i) => {
    const areas = r.areas.split(",").map(s => s.trim()).filter(Boolean);
    const bad = areas.filter(a => !IX.areaById[a]);
    if (bad.length) throw new Error(`Unknown region or state IDs in "${r.n}": ${bad.join(", ")}`);
    const boost = Number(r.boost);
    if (!(boost >= 1 && boost <= 3)) throw new Error(`The factor for "${r.n}" must be between 1 and 3.`);
    if (r.src && !safeUrl(r.src)) throw new Error(`The source link for "${r.n}" must start with http:// or https://`);
    return {id: "list" + (i + 1), n: r.n.slice(0, 200), areas, boost, src: r.src};
  });
  return {year, recordStart, enso, ensoNote: form.querySelector("#o-enso-note").value.trim().slice(0, 400), lists};
}
function readModel(form) {
  const st = settings();
  const num = (id, name, lo, hi) => { const v = Number(form.querySelector(id).value); if (!isFinite(v) || v < lo || v > hi) throw new Error(`${name} must be between ${lo} and ${hi}.`); return v; };
  const out = {wE: num("#m-wE", "wE", 0, 5), wV: num("#m-wV", "wV", 0, 5), wH: num("#m-wH", "wH", 0, 5), tail: num("#m-tail", "The heavy-rain tail", .2, 1.5),
    cut: {med: num("#m-med", "Medium", 0, 5), high: num("#m-high", "High", 0, 5), vhigh: num("#m-vhigh", "Very high", 0, 5)},
    freshHours: num("#m-fresh", "Forecast hours", 1, 240), notice: form.querySelector("#m-notice").value.trim().slice(0, 500), climate: clone(st.climate)};
  if (!(out.cut.med < out.cut.high && out.cut.high < out.cut.vhigh)) throw new Error("Levels must go up: Medium below High below Very high.");
  out.outlook = readOutlook(form);
  form.querySelectorAll("[data-zone]").forEach(i => { const v = Number(i.value); out.climate[i.dataset.zone].m[+i.dataset.mon] = isFinite(v) ? Math.max(0, Math.min(2000, v)) : 0; });
  form.querySelectorAll("[data-zn]").forEach(i => { out.climate[i.dataset.zn].n = i.value.trim().slice(0, 60) || out.climate[i.dataset.zn].n; });
  return out;
}

/* ----- people ----- */
const AGENCY_ROLES = ["agency-publisher", "agency-editor"];
function roleOpts(sel) { return roles().map(r => `<option value="${esc(r.id)}" ${r.id === sel ? "selected" : ""}>${esc(r.n)}</option>`).join(""); }
function agencyOpts(sel) { return `<option value="">—</option>` + agencies().map(a => `<option value="${esc(a.id)}" ${a.id === sel ? "selected" : ""}>${esc(a.n)}</option>`).join(""); }
function adPeople() {
  const pp = UI.admin.people, members = data("members");
  ensureNames(members.map(m => m.id));
  return `
  <div class="card"><h2>Add a person</h2>
    <p class="small muted">Search people in your organisation or already invited to Open Tracker. To add someone from outside, first invite them from the Share menu, then find them here.</p>
    <div class="formgrid">
      <label class="field wide"><span>Name or email</span><input id="pp-q" type="search" autocomplete="off" value="${esc(pp.q)}"></label>
      <label class="field"><span>Role</span><select id="pp-role">${roleOpts(pp.role)}</select></label>
      <label class="field"><span>Acts for agency (needed for agency roles)</span><select id="pp-agency">${agencyOpts(pp.agency)}</select></label>
    </div>
    <div class="results" id="pp-hits">${peopleHits()}</div>
  </div>
  <div class="card"><h2>People with access (${members.length})</h2>
    <p class="small muted">The owner always has full access. People who edit data also need Editor access in the Share menu; agency publishers need at least Contributor access.</p>
    ${UI.admin.confirm?.k === "rm-member" ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr><th>Person</th><th>Role</th><th>Agency</th><th>Active</th><th>Added</th><th></th></tr></thead><tbody>
    ${members.map(m => `<tr><td>${esc(nameOf(m.id))}</td>
      <td><select data-member="${esc(m.id)}" data-f="role" aria-label="Role">${roleOpts(m.role)}</select></td>
      <td><select data-member="${esc(m.id)}" data-f="agency" aria-label="Agency">${agencyOpts(m.agency)}</select></td>
      <td><input type="checkbox" data-member="${esc(m.id)}" data-f="active" ${m.active !== false ? "checked" : ""} aria-label="Active"></td>
      <td class="num small">${esc(m.addedAt ? fmtDate(m.addedAt) : "")}</td>
      <td><button class="sbtn danger" data-act="ad-ask" data-k="rm-member" data-id="${esc(m.id)}">Remove</button></td></tr>`).join("") || `<tr><td colspan="6">No one added yet.</td></tr>`}
    </tbody></table></div></div>`;
}
function peopleHits() {
  const pp = UI.admin.people;
  if (!pp.q.trim()) return "";
  if (!pp.hits.length) return `<p class="muted">No one found. Check the spelling, or invite them from the Share menu first.</p>`;
  const have = new Set(data("members").map(m => m.id));
  return pp.hits.map(h => `<div class="pick"><span class="grow"><span class="t">${esc(h.name || "Unnamed person")}</span><span class="s">${h.guest ? "Outside your organisation" : "In your organisation"}</span></span>${have.has(h.id) ? `<span class="badge">Already added</span>` : `<button class="sbtn primary" data-act="pp-add" data-id="${esc(h.id)}">Add</button>`}</div>`).join("");
}
let peopleSeq = 0;
async function peopleSearch(q) {
  const pp = UI.admin.people; pp.q = q;
  const seq = ++peopleSeq;
  let hits = [];
  try { hits = DB.user && q.trim() ? await DB.user.search(q) : []; } catch (e) {}
  if (seq !== peopleSeq) return;
  pp.hits = hits.slice(0, 8);
  hits.forEach(h => NAMES.map[h.id] = h.name || "");
  const box = $("#pp-hits"); if (box) box.innerHTML = peopleHits();
}

/* ----- roles ----- */
function adRoles() {
  const e = UI.admin.edit;
  if (e && e.coll === "roles") {
    const r = e.rec, locked = !!r.builtin;
    return `<form class="card" id="ad-role" novalidate><h2>${e.isNew ? "Create a role" : locked ? esc(r.n) + " (built-in)" : "Edit role"}</h2>
      ${locked ? `<p class="small muted">Built-in roles can't be changed. Create a custom role to choose different permissions.</p>` : ""}
      <label class="field"><span>Role name</span><input id="r-n" value="${esc(r.n || "")}" ${locked ? "readonly" : ""} maxlength="60"></label>
      <fieldset class="field" style="border:0;padding:0;margin:0"><span>Permissions</span><div class="checks" style="flex-direction:column;align-items:flex-start">
        ${PERMS.map(([k, n]) => `<label><input type="checkbox" data-perm="${k}" ${(r.perms || []).includes(k) ? "checked" : ""} ${locked ? "disabled" : ""}> ${esc(n)}</label>`).join("")}
      </div></fieldset>
      <p class="small" id="ad-err" role="alert" style="color:var(--vhigh)"></p>
      <div class="toolbar">${locked ? "" : `<button class="sbtn primary" type="submit">Save role</button>`}<button class="sbtn" type="button" data-act="ad-cancel">${locked ? "Close" : "Cancel"}</button></div></form>`;
  }
  const inUse = id => data("members").filter(m => m.role === id).length;
  return `<div class="card"><h2>Roles</h2><p class="small muted">A role is a named set of permissions. Assign roles to people under People.</p>
    <div class="toolbar"><button class="sbtn primary" data-act="role-new">Create a role</button></div>
    ${UI.admin.confirm?.k === "rm-role" ? confirmBox() : ""}
    <div class="tablewrap"><table><thead><tr><th>Role</th><th>Permissions</th><th class="n">People</th><th></th></tr></thead><tbody>
    ${roles().map(r => `<tr><td><b>${esc(r.n)}</b> ${r.builtin ? `<span class="badge">Built-in</span>` : ""}</td><td class="small">${esc((r.perms || []).map(p => PERMS.find(x => x[0] === p)?.[1] || p).join("; "))}</td><td class="n">${inUse(r.id)}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="role-edit" data-id="${esc(r.id)}">${r.builtin ? "View" : "Edit"}</button>${!r.builtin && !inUse(r.id) ? ` <button class="sbtn danger" data-act="ad-ask" data-k="rm-role" data-id="${esc(r.id)}">Delete</button>` : ""}</td></tr>`).join("")}
    </tbody></table></div></div>`;
}

/* ----- agency access requests and posts ----- */
function adRequests() {
  const reqs = AG.requests;
  ensureNames(reqs.map(r => r.id));
  return `<div class="card"><h2>Access requests</h2>
    <p class="small muted">Agency staff ask for publishing access from the Agency portal. Approving links them to the agency; their posts then appear publicly.</p>
    <div class="tablewrap"><table><thead><tr><th>Person</th><th>Agency</th><th>Their note</th><th>Sent</th><th></th></tr></thead><tbody>
    ${reqs.map(r => `<tr><td>${esc(nameOf(r.id))}</td><td><select id="rq-${esc(r.id)}" aria-label="Agency">${agencyOpts(r.request.agency)}</select></td><td class="small">${esc(r.request.note || "")}</td><td class="num small">${esc(fmtDate(r.request.at))}</td>
      <td style="white-space:nowrap"><button class="sbtn primary" data-act="rq-yes" data-id="${esc(r.id)}">Approve</button> <button class="sbtn danger" data-act="rq-no" data-id="${esc(r.id)}">Decline</button></td></tr>`).join("") || `<tr><td colspan="5">No requests waiting.</td></tr>`}
    </tbody></table></div></div>`;
}
function adPosts() {
  const pm = publisherMap();
  const rows = [];
  Object.entries(AG.posts).forEach(([uid, l]) => l.forEach(p => rows.push(Object.assign({}, p, {uid, agency: pm[uid]}))));
  rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  ensureNames(rows.map(r => r.uid));
  return `<div class="card"><h2>Agency posts</h2><p class="small muted">Everything linked agency staff have published. Withdraw a post to remove it from public pages; it stays in this list.</p>
    <div class="tablewrap"><table><thead><tr><th>When</th><th>Agency</th><th>By</th><th>Type</th><th>Details</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(p => `<tr><td class="num small">${esc(fmtDate(p.at))}</td><td>${esc(p.agency?.n || "")}</td><td>${esc(nameOf(p.uid))}</td><td>${esc((POST_TYPES.find(x => x[0] === p.type) || [0, p.type])[1])}</td><td class="small">${esc(postSummary(p))}</td><td>${p.retracted ? "Withdrawn" : "Live"}</td>
      <td>${p.retracted ? "" : `<button class="sbtn danger" data-act="post-withdraw" data-uid="${esc(p.uid)}" data-id="${esc(p.id)}">Withdraw</button>`}</td></tr>`).join("") || `<tr><td colspan="7">No agency posts yet.</td></tr>`}
    </tbody></table></div></div>`;
}

/* ----- audit log ----- */
const AUDIT = {loaded: false, rows: [], err: false, open: null};
async function loadAudit() {
  try {
    const snap = await DB.api.collection("audit").orderBy("at", "desc").limit(1000).get();
    AUDIT.rows = snap.docs.map(d => Object.assign({}, d.data(), {_id: d.id}));
    AUDIT.err = false;
  } catch (e) { AUDIT.err = true; }
  AUDIT.loaded = true;
  if (UI.mode === "admin" && UI.admin.tab === "audit") render();
}
function auditFiltered() {
  const f = UI.admin.auditF, q = norm(f.q);
  return AUDIT.rows.filter(r => (!f.coll || r.coll === f.coll) && (!f.by || r.by === f.by) && (!q || norm(`${r.act} ${r.coll} ${r.id} ${JSON.stringify(r.after || "")}`).includes(q)));
}
function changedKeys(b, a) {
  if (!b || !a) return "";
  const keys = [...new Set(Object.keys(b).concat(Object.keys(a)))].filter(k => !["updated", "updatedBy", "proposedBy", "proposedFor"].includes(k) && JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  return keys.join(", ");
}
function adAudit() {
  if (!AUDIT.loaded) { loadAudit(); return `<div class="card"><p>Loading the audit log…</p></div>`; }
  if (AUDIT.err) return `<div class="card"><p>The audit log could not be loaded.</p><button class="sbtn" data-act="audit-reload">Try again</button></div>`;
  const f = UI.admin.auditF, rows = auditFiltered();
  const colls = [...new Set(AUDIT.rows.map(r => r.coll))].sort(), people = [...new Set(AUDIT.rows.map(r => r.by).filter(Boolean))];
  ensureNames(people);
  return `<div class="card"><h2>Audit log</h2><p class="small muted">Every change by every editor and administrator: who, when, what, and the record before and after. The latest 1,000 entries are shown.</p>
    <div class="formgrid">
      <label class="field"><span>Section</span><select id="au-coll"><option value="">All sections</option>${colls.map(c => `<option value="${esc(c)}" ${f.coll === c ? "selected" : ""}>${esc(tabLabel(c))}</option>`).join("")}</select></label>
      <label class="field"><span>Person</span><select id="au-by"><option value="">Everyone</option>${people.map(p => `<option value="${esc(p)}" ${f.by === p ? "selected" : ""}>${esc(nameOf(p))}</option>`).join("")}</select></label>
      <label class="field"><span>Search</span><input id="au-q" type="search" value="${esc(f.q)}"></label>
    </div>
    <div class="toolbar"><button class="sbtn" data-act="audit-reload">Refresh</button><button class="sbtn" data-act="audit-export">Download as CSV</button><span class="small muted">${rows.length} entries</span></div>
    <div class="tablewrap"><table><thead><tr><th>When</th><th>Who</th><th>Role</th><th>Action</th><th>Section</th><th>Record</th><th>Fields changed</th><th></th></tr></thead><tbody>
    ${rows.slice(0, 400).map((r, i) => `<tr><td class="num small">${esc(fmtDate(r.at))}</td><td>${esc(r.by ? nameOf(r.by) : "—")}</td><td class="small">${esc(r.role || "")}</td><td>${esc(r.act)}</td><td>${esc(tabLabel(r.coll))}</td><td class="small">${esc(r.id)}</td><td class="small">${esc(changedKeys(r.before, r.after))}</td>
      <td style="white-space:nowrap"><button class="sbtn" data-act="audit-open" data-i="${i}">Details</button>${canUndo(r) ? ` <button class="sbtn" data-act="audit-undo" data-i="${i}">Undo</button>` : ""}</td></tr>
      ${AUDIT.open === i ? `<tr><td colspan="8"><div class="grid2"><div><b>Before</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(r.before, null, 1))}</pre></div><div><b>After</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(r.after, null, 1))}</pre></div></div></td></tr>` : ""}`).join("") || `<tr><td colspan="8">No entries match.</td></tr>`}
    </tbody></table></div></div>`;
}
/* undo is offered only for whole-record changes made through the editor */
function canUndo(r) { return !!SCHEMA[r.coll] && canWrite(r.coll) && /^(undid )?(approved )?(added|edited|deleted)$/.test(r.act) && (r.before || r.after) && ID_RE.test(r.id); }
function auditCsv(rows) {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["when", "who_id", "who", "role", "action", "section", "record", "fields_changed", "before", "after"];
  return [head.join(",")].concat(rows.map(r => [r.at, r.by, r.by ? nameOf(r.by) : "", r.role, r.act, r.coll, r.id, changedKeys(r.before, r.after), JSON.stringify(r.before), JSON.stringify(r.after)].map(cell).join(","))).join("\n");
}
async function saveFile(filename, text, type) {
  if (!DB.downloads) { toast("Downloads aren't available in this view."); return; }
  try { const r = await DB.downloads.save({filename, data: new Blob([text], {type})}); if (r?.status === "saved") toast("Saved " + filename); }
  catch (e) { if (e?.code !== "cancelled" && e?.code !== "declined") toast("The file could not be saved. Try again."); }
}

/* ----- admin actions ----- */
const NEW_DEFAULTS = () => ({
  alerts: {level: "warning", c: "GH", issued: new Date().toISOString(), expires: new Date(Date.now() + 864e5).toISOString(), areas: [], agency: ""},
  forecasts: {zone: "acc", at: new Date().toISOString()},
  hotspots: {c: "GH", r: "GH-AA", d: ["rain"], z: "acc", t: 70, sev: 2, exp: 2, vul: .5, ll: [-0.2, 5.6], aka: []},
  events: {c: "GH", year: NOW.getFullYear(), ids: []}, regionEvents: {r: "GH-AA", year: NOW.getFullYear()},
  safe: {c: "GH", ll: [-0.2, 5.6]}, roads: {c: "GH", ll: [-0.2, 5.6]}, feeds: {status: "off", c: "GH"}, contacts: {c: "GH"},
  dams: {c: "GH", status: "season", season: Array(12).fill(0), ll: [0, 8]}, agencies: {c: "GH", kind: "disaster", status: "active", publishers: [], push: true},
  notifications: {level: "warning", c: AUTH.agency()?.c || "GH", agency: noticeSenders()[0]?.[0], areas: [], at: new Date().toISOString(), expires: new Date(Date.now() + 864e5).toISOString()}
});
async function adminAct(act, el) {
  const a = UI.admin;
  try {
    switch (act) {
      case "ad-tab": a.tab = el.dataset.k; a.edit = null; a.q = ""; a.confirm = null; if (a.tab === "audit") AUDIT.loaded = false; return render();
      case "ad-new": {
        const k = el.dataset.k; a.tab = k; a.confirm = null;
        const prefix = {alerts: "alert", events: "ev", agencies: "ag", notifications: "nt"}[k] || k.slice(0, 4);
        a.edit = {coll: k, isNew: true, rec: Object.assign({id: k === "forecasts" ? "" : `${prefix}-${Date.now().toString(36)}`}, NEW_DEFAULTS()[k] || {})};
        return render();
      }
      case "ad-edit": a.edit = {coll: el.dataset.k, isNew: false, rec: clone(data(el.dataset.k).find(r => r.id === el.dataset.id) || {})}; a.confirm = null; return render();
      case "ad-cancel": a.edit = null; a.confirm = null; return render();
      case "ad-ask": {
        const k = el.dataset.k;
        a.confirm = {
          del: {k, coll: el.dataset.coll, id: el.dataset.id, msg: `Delete “${el.dataset.id}”? You can undo this from the audit log.`, yes: "Delete"},
          reset: {k, msg: "Replace ALL data with the starting data? Download a backup first if you need your edits.", yes: "Reset everything"},
          "model-reset": {k, msg: "Restore the default model weights, levels and rain tables?", yes: "Restore defaults"},
          "rm-member": {k, id: el.dataset.id, msg: "Remove this person's Open Tracker role? They keep their Share-menu access until you change it there.", yes: "Remove"},
          "rm-role": {k, id: el.dataset.id, msg: "Delete this role?", yes: "Delete role"},
          "rm-replay": {k, id: el.dataset.id, msg: "Delete this replay and all its map layers?", yes: "Delete replay"},
          "an-prune": {k, msg: "Delete every visit recorded more than 90 days ago?", yes: "Delete old visits"},
          "an-clear": {k, msg: "Delete ALL analytics? Visit counts start again from zero.", yes: "Delete all analytics"}
        }[k];
        return render();
      }
      case "ad-no": a.confirm = null; return render();
      case "ad-yes": {
        const c = a.confirm; a.confirm = null;
        if (c.k === "del") { await REPO.del(c.coll, c.id); a.edit = null; if (!APPROVAL.gate()) toast("Deleted."); }
        if (c.k === "reset") await REPO.writeAll(REPO.snapshot(true), "Reset to starting data");
        if (c.k === "import") await REPO.writeAll(c.payload, "Restore from backup");
        if (c.k === "model-reset") { await REPO.setSettings(clone(DEFAULT_SETTINGS), "restored defaults"); toast("Default settings restored."); }
        if (c.k === "rm-member") { await REPO.removeMember(c.id); toast("Removed."); }
        if (c.k === "rm-role") { await REPO.del("roles", c.id); toast("Role deleted."); }
        if (c.k === "rm-replay") { await deleteReplay(c.id); toast("Replay deleted."); }
        if (c.k === "an-prune" || c.k === "an-clear") await anHousekeep(c.k === "an-clear");
        return render();
      }
      case "ad-seed": await REPO.seed(); return render();
      case "ad-export": return saveFile(`opentracker-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(REPO.snapshot(false), null, 2), "application/json");
      case "pp-add": {
        const pp = a.people;
        if (AGENCY_ROLES.includes(pp.role) && !pp.agency) { toast("Choose the agency this person works for."); return; }
        await REPO.setMember(el.dataset.id, {role: pp.role, agency: pp.agency || null, active: true});
        pp.q = ""; pp.hits = []; toast("Person added."); return render();
      }
      case "role-new": a.edit = {coll: "roles", isNew: true, rec: {id: "role-" + Date.now().toString(36), n: "", perms: []}}; return render();
      case "role-edit": a.edit = {coll: "roles", isNew: false, rec: clone(roles().find(r => r.id === el.dataset.id) || {})}; return render();
      case "rq-yes": { const ag = $("#rq-" + CSS.escape(el.dataset.id))?.value; if (!ag) { toast("Choose an agency first."); return; } await REPO.decideRequest(el.dataset.id, true, ag); toast("Approved."); return render(); }
      case "rq-no": await REPO.decideRequest(el.dataset.id, false, null); toast("Declined."); return render();
      case "post-withdraw": await REPO.withdrawPost(el.dataset.uid, el.dataset.id); toast("Withdrawn."); return render();
      case "audit-reload": AUDIT.loaded = false; return render();
      case "audit-open": AUDIT.open = AUDIT.open === +el.dataset.i ? null : +el.dataset.i; return render();
      case "audit-export": return saveFile(`opentracker-audit-${new Date().toISOString().slice(0, 10)}.csv`, auditCsv(auditFiltered()), "text/csv");
      case "audit-undo": {
        const r = auditFiltered()[+el.dataset.i]; if (!r) return;
        REPO.require(canUndo(r), "undo this change");
        if (r.before) { const b = clone(r.before); delete b.id; await DB.api.collection(r.coll).doc(r.id).set(b); }
        else await DB.api.collection(r.coll).doc(r.id).delete();
        await REPO.audit("undid " + r.act, r.coll, r.id, r.after, r.before);
        toast("Change undone."); AUDIT.loaded = false; return render();
      }
    }
  } catch (e) { toast(errText(e)); }
}
async function adminSubmit(form) {
  const err = form.querySelector("#ad-err");
  try {
    if (form.id === "ad-model") { await REPO.setSettings(readModel(form)); toast("Model settings saved."); return; }
    if (form.id === "ad-role") {
      const rec = UI.admin.edit.rec;
      const n = form.querySelector("#r-n").value.trim();
      if (!n) throw new Error("Give the role a name.");
      if (roles().some(r => r.id !== rec.id && r.n.toLowerCase() === n.toLowerCase())) throw new Error("A role with that name already exists.");
      const perms = [...form.querySelectorAll("[data-perm]")].filter(x => x.checked).map(x => x.dataset.perm).filter(p => PERM_KEYS.includes(p));
      if (!perms.length) throw new Error("Choose at least one permission.");
      await REPO.set("roles", {id: rec.id, n: n.slice(0, 60), perms});
      UI.admin.edit = null; toast("Role saved."); return render();
    }
    const coll = form.dataset.coll;
    await REPO.set(coll, readForm(coll, form));
    UI.admin.edit = null; if (!APPROVAL.gate()) toast("Saved."); render();
  } catch (e) { if (err) err.textContent = errText(e); else toast(errText(e)); }
}
async function memberChange(el) {
  try {
    const uid = el.dataset.member, f = el.dataset.f, m = data("members").find(x => x.id === uid) || {};
    const patch = f === "active" ? {active: el.checked} : {[f]: el.value};
    if (f === "agency") patch.agency = el.value || null;
    if (f === "role" && AGENCY_ROLES.includes(el.value) && !m.agency) toast("Now choose the agency for this person.");
    await REPO.setMember(uid, patch);
    toast("Access updated.");
  } catch (e) { toast(errText(e)); render(); }
}
async function adminImport(file) {
  try {
    if (file.size > 15e6) throw new Error();
    const o = JSON.parse(await file.text());
    if (!o || !BACKUP_IDS.includes(o.app) || !COLLS.every(k => o[k] === undefined || Array.isArray(o[k]))) throw new Error();
    UI.admin.confirm = {k: "import", payload: o, msg: `Replace all data with “${file.name}” (saved ${fmtDate(o.exported)})? Current data will be overwritten.`, yes: "Replace all data"};
    render();
  } catch (e) { toast("That file isn't an Open Tracker backup."); }
}

/* ---- ui/views-world.js ---- */
/* ===== Flood and heat for every country: the world, a country's projected reach, a town, and the 3D projection ===== */
const RCH = {day: 0, timer: null};   /* the country reach screen: chosen forecast day and its play timer */

/* the line under a screen when live data is missing, depending on where Open Tracker runs */
function liveDataMissing(name) {
  return window.WEBAPP
    ? `Live flood and heat data for ${esc(name)} appears once this site's data feeds have run.`
    : `Live flood and heat data shows here once an administrator imports the latest snapshot from the Open Tracker website (Admin → Live data).`;
}
function loadingCard(what) { return `<div class="card"><p class="muted" role="status">Loading ${esc(what)}…</p></div>`; }
function sourcesNote(doc) {
  const names = (doc?.sources || []).map(id => ({"open-meteo-forecast": "Open-Meteo forecasts", "open-meteo-baselines": "ERA5 past weather (Copernicus)", "open-meteo-rivers": "GloFAS river forecasts (Copernicus)",
    gdacs: "GDACS", cap: "official warnings (CAP)", "satellite-scenes": "Copernicus Sentinel satellites", weatherex: "WeatherEx"}[id])).filter(Boolean);
  return `<p class="small muted">Heat levels and flood signs are Open Tracker estimates from open data, not official warnings. ${names.length ? "Data: " + esc(names.join(", ")) + ". " : ""}${esc(hazardsUpdated(doc))}</p>`;
}

/* ---------- the world ---------- */
function viewWorld() {
  const doc = hazardsDoc("world");
  const rows = doc ? Object.entries(doc.countries).map(([c, v]) => ({c, v})).sort((a, b) => (b.v.heat ?? -1) - (a.v.heat ?? -1) || (b.v.alerts + b.v.disasters) - (a.v.alerts + a.v.disasters)) : [];
  const watch = rows.filter(r => (r.v.heat ?? 0) >= 2 || r.v.alerts || r.v.disasters || r.v.risingRivers);
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Flood and heat around the world</h1>
    <p class="muted">Each country is coloured by the worst heat expected in its towns over the next 3 days. Tap a country to see how far heat and floods could reach there.</p>
    ${doc === undefined ? loadingCard("the world summary") : doc === null ? `<div class="notice info">${ICON.info}<div>${liveDataMissing("every country")}</div></div>` : ""}
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="World map of heat and floods"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">Natural Earth · MapLibre</div></div>
    ${heatLegend()}
    <div class="card"><h2>Countries to watch</h2>
      ${watch.length ? `<div class="results">${watch.slice(0, 40).map(r => countryPick(r.c, r.v)).join("")}</div>` : `<p class="muted">${doc ? "No country has a heatwave, a rising river or a flood warning in the data right now." : "Nothing to show yet."}</p>`}
    </div>
    <div class="card"><h2>Any country</h2>${countrySelect("")}</div>
    ${doc ? sourcesNote({sources: [], updated: doc.updated}) : ""}`;
}
function countryPick(c, v) {
  const bits = [v.dangerPlaces ? `${v.dangerPlaces} town${v.dangerPlaces > 1 ? "s" : ""} in dangerous heat` : "", v.floodAlerts ? `${v.floodAlerts} official flood warning${v.floodAlerts > 1 ? "s" : ""}` : "",
    v.disasters ? `${v.disasters} current disaster${v.disasters > 1 ? "s" : ""}` : "", v.risingRivers ? `${v.risingRivers} river${v.risingRivers > 1 ? "s" : ""} rising fast` : ""].filter(Boolean);
  return `<button class="pick" data-act="reach" data-k="${esc(c)}"><span class="grow"><span class="t">${esc(countryName(c))}</span><span class="s">${esc(bits.join(" · ") || "Live data available")}</span></span>${Number.isFinite(v.heat) ? heatChip(v.heat) : ""}</button>`;
}
function countrySelect(selected) {
  const opts = Object.entries(WORLD.countries).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([c, v]) => `<option value="${esc(c)}" ${c === selected ? "selected" : ""}>${esc(v.n)}</option>`).join("");
  return `<label class="field"><span>Choose a country</span><select id="country-pick"><option value="">Choose…</option>${opts}</select></label>`;
}
function heatLegend() {
  return `<div class="legend" aria-label="Heat levels">${HEAT_LEVELS.map(l => `<span><i class="sw heat-sw heat-${l.k}"></i>${esc(l.n)}</span>`).join("")}</div>`;
}
function worldMapView() {
  const doc = hazardsDoc("world");
  const world = {};
  if (doc) for (const [c, v] of Object.entries(doc.countries)) if (Number.isFinite(v.heat)) world[c] = v.heat;
  return {show: "none", world, fit: {ll: [15, 18], z: 1.3}, pitch: 0};
}

/* ---------- a country: how far heat and floods could reach ---------- */
function viewReach(cc) {
  const doc = hazardsDoc(cc), name = countryName(cc);
  const days = doc && doc.heat[0] ? doc.heat[0].days : [];
  const day = Math.min(RCH.day, Math.max(0, days.length - 1));
  const reach = heatReach(doc, day), signs = floodSigns(doc), fl = floodLevel(signs);
  const p = {type: DETAILED.has(cc) ? "country" : "wc", id: cc};
  const dayBtns = days.length ? `<div class="when days" role="group" aria-label="Day">${days.map((d, i) => `<button data-act="reach-day" data-k="${i}" aria-pressed="${i === day}">${esc(dayName(d.date, i))}</button>`).join("")}</div>
      <button class="sbtn" id="reach-play" data-act="reach-play" aria-pressed="${!!RCH.timer}">${RCH.timer ? "❚❚ Pause" : "▶ Play the week"}</button>` : "";
  const towns = doc ? doc.heat.map(h => ({h, d: h.days[day]})).filter(x => x.d).sort((a, b) => b.d.level - a.d.level || b.h.pop - a.h.pop) : [];
  return `
    <button class="back" data-act="back">← Back</button>
    <nav class="crumbs" aria-label="You are here"><button data-act="world">World</button><span aria-hidden="true">›</span><span>${esc(name)}</span></nav>
    <h1>Flood and heat reach: ${esc(name)}</h1>
    ${alertBanners(p)}
    ${doc === undefined ? loadingCard("live data for " + name) : doc === null ? `<div class="notice info">${ICON.info}<div>${liveDataMissing(name)}</div></div>` : ""}
    ${dayBtns}
    <div class="row two">
      <div class="card heat-${reach.worst}" id="say"><h2>Heat ${days[day] ? esc(dayPhrase(days[day].date, day)) : ""}</h2>
        ${doc ? `<p class="big-line">${heatChip(reach.worst)}</p><p>${reach.towns.length ? `Heatwave or worse in <b>${reach.towns.length}</b> town${reach.towns.length > 1 ? "s" : ""} where about <b>${esc(fmtPeople(reach.people))}</b> people live.` : "No town is in a heatwave on this day."}</p>` : `<p class="muted">No data yet.</p>`}</div>
      <div class="card flood-${fl}"><h2>Floods, next days</h2>
        ${doc ? `<p class="big-line">${floodChip(fl)}</p><p>${signs.length ? `${signs.filter(s => s.kind === "official").length} official warning${signs.filter(s => s.kind === "official").length === 1 ? "" : "s"} · ${signs.filter(s => s.kind === "river").length} river${signs.filter(s => s.kind === "river").length === 1 ? "" : "s"} rising · ${signs.filter(s => s.kind === "rain").length} place${signs.filter(s => s.kind === "rain").length === 1 ? "" : "s"} with heavy rain · ${signs.filter(s => s.kind === "disaster").length} current disaster${signs.filter(s => s.kind === "disaster").length === 1 ? "" : "s"}` : "No flood signs in the data."}</p>` : `<p class="muted">No data yet.</p>`}</div>
    </div>
    <div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Map of heat and flood reach in ${esc(name)}"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">Natural Earth · MapLibre</div></div>
    <div class="legend">${HEAT_LEVELS.slice(2).map(l => `<span><i class="sw heat-sw heat-${l.k}"></i>${esc(l.n)} reach</span>`).join("")}<span><i class="sw flood-sw flood-warning"></i>Flood warning reach</span><span><i class="sw flood-sw flood-watch"></i>Flood watch reach</span></div>
    ${signs.length ? `<div class="card"><h2>Where floods could reach</h2><ul class="plain signs">${signs.slice(0, 40).map(s => `<li>${signChip(s.level)} ${esc(s.text)}</li>`).join("")}</ul></div>` : ""}
    ${towns.length ? `<div class="card"><h2>Heat by town ${days[day] ? esc(dayPhrase(days[day].date, day)) : ""}</h2><p class="small muted">Tap a town for its week and the projected flood in 3D.</p>
      <div class="results">${towns.slice(0, 40).map(({h, d}) => `<button class="pick" data-act="open" data-type="wp" data-id="${esc(h.id)}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">High ${esc(fmtTemp(d.tmax))}, feels like ${esc(fmtTemp(d.feels))}</span></span>${heatChip(d.level)}</button>`).join("")}</div></div>` : ""}
    ${DETAILED.has(cc) ? `<button class="btn" data-act="open" data-type="country" data-id="${cc}">Recorded flood areas in ${esc(name)}</button>` : ""}
    <div class="card"><h2>Find a town in ${esc(name)}</h2><div class="results">${(WIX.byCountry.get(cc) || []).slice(0, 12).map(w => `<button class="pick" data-act="open" data-type="wp" data-id="${esc(w.id)}"><span class="grow"><span class="t">${esc(w.n)}</span><span class="s">${esc(w.a1)}</span></span><span aria-hidden="true">→</span></button>`).join("") || `<p class="muted">Search for your town on the home screen.</p>`}</div></div>
    ${emergencyHtml(cc)}
    ${alertMeHtml(p)}
    ${doc ? sourcesNote(doc) : ""}`;
}
const fmtTemp = v => (Number.isFinite(v) ? `${Math.round(v)} °C` : "—");
function reachMapView(cc) {
  const doc = hazardsDoc(cc), c = worldCountry(cc);
  const day = RCH.day;
  const heatTowns = doc ? doc.heat.filter(h => h.days[day]).map(h => ({id: h.id, ll: h.ll, level: h.days[day].level, pop: h.pop})) : [];
  return {show: "none", heatTowns, floodSigns: floodSigns(doc), fit: c ? {bounds: [[c.b[0], c.b[1]], [c.b[2], c.b[3]]], ll: c.ll, z: 5, maxZoom: 7} : {ll: [0, 15], z: 1.6}};
}
function reachToggle() {
  if (RCH.timer) { reachStop(); render(); return; }
  RCH.timer = setInterval(() => { if (UI.screen !== "reach" && !(UI.screen === "answer" && UI.place?.type === "wc")) { reachStop(); return; } RCH.day = (RCH.day + 1) % 7; render(); }, 1600);
  render();
}
function reachStop() { clearInterval(RCH.timer); RCH.timer = null; }

/* ---------- heat and flood cards for one spot (towns, and Ghana's and Nigeria's flood areas) ---------- */
function heatCardHtml(ll, cc) {
  const doc = hazardsDoc(cc);
  if (doc === undefined) return loadingCard("the heat forecast");
  const near = heatNear(doc, ll);
  if (!near) return `<div class="card"><h2>Heat this week</h2><p class="muted">${doc ? "No heat forecast for a town within 75 km yet." : liveDataMissing(countryName(cc))}</p></div>`;
  const h = near.h, today = h.days[0], lv = today.level;
  const open = UI.open.heat;
  return `
    <div class="riskcard heat-card heat-${lv}"><div><div class="big">${esc(HEAT_LEVELS[lv].word)}</div>
      <div class="sub">Today${near.d > 3 ? ` in ${esc(h.n)}` : ""}: high ${esc(fmtTemp(today.tmax))}, feels like ${esc(fmtTemp(today.feels))}${Number.isFinite(today.wetBulb) ? `, wet-bulb ${esc(fmtTemp(today.wetBulb))}` : ""}.</div></div></div>
    <div class="card"><h2>Heat this week${near.d > 3 ? ` near ${esc(h.n)}` : ""}</h2>
      <div class="week" role="list">${h.days.map((d, i) => `<div class="day heat-${d.level}" role="listitem"><b>${esc(dayName(d.date, i))}</b><span>${esc(HEAT_LEVELS[d.level].n)}</span><span class="num">${esc(fmtTemp(d.tmax))}</span><span class="small">feels ${esc(fmtTemp(d.feels))}</span></div>`).join("")}</div>
      ${today.why?.length ? `<p class="small">Why: ${esc(today.why.join("; "))}.</p>` : ""}
      <p class="small muted">${h.local ? `Judged against ${esc(h.n)}'s own usual heat from past weather, and against limits for the human body.` : `Still learning ${esc(h.n)}'s usual heat; for now judged against limits for the human body only.`}</p>
      <button class="sbtn" data-act="toggle" data-k="heat" aria-expanded="${!!open}">What should I do in the heat?</button>
      ${open ? `<ul class="steps">${HEAT_ADVICE[Math.max(1, lv)].map(a => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
    </div>`;
}
function floodCardHtml(ll, cc, withProject) {
  const doc = hazardsDoc(cc);
  if (doc === undefined) return "";
  const signs = floodSigns(doc, ll, 60), lv = floodLevel(signs), near = heatNear(doc, ll, 40);
  return `<div class="card flood-${lv}"><h2>Flood signs near here</h2>
    <p>${floodChip(lv)}${near ? ` <span class="small">Rain in the next 3 days: <b>${Math.round(rain3(near.h))} mm</b>${near.d > 3 ? ` near ${esc(near.h.n)}` : ""}</span>` : ""}</p>
    ${signs.length ? `<ul class="plain signs">${signs.slice(0, 8).map(s => `<li>${signChip(s.level)} ${esc(s.text)}${s.alert?.instruction ? `<br><span class="small">${esc(s.alert.instruction)}</span>` : ""}</li>`).join("")}</ul>` : `<p class="small muted">${doc ? "No official flood warning, rising river or heavy rain in the data within 60 km." : liveDataMissing(countryName(cc))}</p>`}
    ${withProject ? `<button class="btn primary" data-act="project">${ICON.info}See where a flood would reach here, in 3D</button>` : ""}
  </div>`;
}

/* ---------- a town anywhere ---------- */
function viewWorldPlace(p) {
  const w = worldPlace(p.id);
  if (!w) { UI.place = null; return viewWhere(); }
  const crumbs = crumbsFor(p);
  const hot = DETAILED.has(w.c) ? IX.hot.filter(h => km(h.ll, w.ll) < 15).slice(0, 6) : [];
  return `
    <button class="back" data-act="back">← Back</button>
    <nav class="crumbs" aria-label="You are here">${crumbs.map((x, i) => i < crumbs.length - 1 ? `<button data-act="open" data-type="${x.p.type}" data-id="${esc(x.p.id ?? "")}">${esc(x.n)}</button><span aria-hidden="true">›</span>` : `<span>${esc(x.n)}</span>`).join("")}</nav>
    <h1>${esc(w.n)}</h1>
    <p class="muted">${esc([w.a1, countryName(w.c)].filter(Boolean).join(", "))}${w.pop ? ` · about ${esc(fmtPeople(w.pop))} people` : ""}</p>
    ${alertBanners(p)}
    ${heatCardHtml(w.ll, w.c)}
    ${floodCardHtml(w.ll, w.c, true)}
    ${hot.length ? `<div class="card"><h2>Recorded flood areas nearby</h2><div class="results">${hot.map(h => `<button class="pick" data-act="open" data-type="hotspot" data-id="${h.id}"><span class="grow"><span class="t">${esc(h.n)}</span><span class="s">${esc(placeName({type: "area", id: h.r}))}</span></span>${chip(riskOf(h).level)}</button>`).join("")}</div></div>` : ""}
    ${replaysCard(p)}
    ${alertMeHtml(p)}
    <button class="btn" data-act="reach" data-k="${esc(w.c)}">Flood and heat reach across ${esc(countryName(w.c))}</button>
    ${emergencyHtml(w.c)}
    ${contributeCta(p)}
    ${hazardsDoc(w.c) ? sourcesNote(hazardsDoc(w.c)) : ""}`;
}

/* ---------- the projected flood in 3D ---------- */
function viewProject() {
  const p = UI.place, t = projectionTarget(p);
  if (!t) return `<button class="back" data-act="back">← Back</button><h1>Projected flood</h1><p>Choose a town or a flood area first.</p>`;
  if (PROJ.key && PROJ.key !== t.key) projReset();
  const doc = hazardsDoc(t.c) || null;
  const scs = projectionScenarios(t, doc);
  if (!scs.some(s => s.id === PROJ.sc)) PROJ.sc = scs[0].id;
  const avail = projectionAvailable(), res = PROJ.status === "done" ? PROJ.result : null;
  const busy = PROJ.status === "loading" || PROJ.status === "running";
  const models = replaysFor(p).filter(r => r.kind === "model");
  return `
    <button class="back" data-act="back">← Back</button>
    <h1>Projected flood: ${esc(t.n)}</h1>
    <p class="muted">Where water would reach, how deep it would get and how much water there would be, on the real ground around ${esc(t.n)}.</p>
    ${avail ? `
    <div class="card"><h2>Choose what happens</h2>
      <div class="choices" role="radiogroup" aria-label="Storm">${scs.map(s => `<button class="choice" role="radio" data-act="proj-sc" data-k="${s.id}" aria-checked="${PROJ.sc === s.id}"><b>${esc(s.n)}</b><span class="small">${esc(s.desc)}</span></button>`).join("")}</div>
      <div class="when" role="group" aria-label="Area">${Object.entries(PROJ_AREAS).map(([k, a]) => `<button data-act="proj-area" data-k="${k}" aria-pressed="${PROJ.area === k}">${esc(a.n)}</button>`).join("")}</div>
      <button class="btn primary" data-act="proj-run" ${busy ? "disabled" : ""}>${busy ? "Working…" : res ? "Run again" : "Show the projected flood"}</button>
      ${busy ? `<div class="progress" role="progressbar" aria-label="Projection progress"><div id="proj-bar" style="width:${Math.round(PROJ.progress * 100)}%"></div></div><p class="small muted" role="status">${PROJ.status === "loading" ? "Fetching the ground heights…" : "Working out where the water goes, hour by hour…"}</p>` : ""}
      ${PROJ.status === "error" ? `<div class="notice alert" role="alert">${ICON.warn}<div>${esc(PROJ.error)}</div></div>` : ""}
    </div>` : `<div class="notice info">${ICON.info}<div><b>The 3D projection runs on the Open Tracker website.</b> It needs the street map and ground heights, which this page cannot load. Projections saved there and imported here appear below.</div></div>`}
    <div class="mapbox tall" id="mapbox"><div id="map" role="region" aria-label="3D map of the projected flood around ${esc(t.n)}"></div>
      <div class="mapctl"><button data-act="zoom" data-d="1" aria-label="Zoom in">+</button><button data-act="zoom" data-d="-1" aria-label="Zoom out">−</button></div>
      <div class="mapattr">${avail ? "© OpenStreetMap contributors · OpenFreeMap · AWS Terrain Tiles · MapLibre" : "Natural Earth · MapLibre"}</div></div>
    ${res ? projectionResultHtml(res) : ""}
    ${models.length ? `<div class="card"><h2>Saved flood projections and models here</h2><div class="results">${models.slice(0, 6).map(replayPick).join("")}</div></div>` : ""}`;
}
function projectionResultHtml(res) {
  const pk = res.frames[res.peakAt], here = res.hereIdx >= 0 ? res.peak.depth[res.hereIdx] : 0, hereHour = res.hereIdx >= 0 ? res.peak.hour[res.hereIdx] : 0;
  const b = res.balance, n = res.frames.length;
  return `
    <div class="riskcard flood-proj lv-${here >= 1.2 ? "vhigh" : here >= 0.3 ? "high" : here >= FLOODSIM.WET ? "med" : "low"}" id="say"><div>
      <div class="big">${here >= FLOODSIM.WET ? `Water ${esc(depthWords(here))}` : "Stays dry"}</div>
      <div class="sub">At ${esc(res.here.n)}${here >= FLOODSIM.WET ? `: up to ${here.toFixed(2)} m deep, highest at hour ${hereHour}` : ` in this projection (${esc(res.sc.n.toLowerCase())})`}.</div></div></div>
    <div class="stats">
      <div><span class="small">Area under water at the peak</span><b class="num">${fmtArea(pk.km2)}</b></div>
      <div><span class="small">Water on the ground at the peak</span><b class="num">${esc(fmtVolume(pk.volume))}</b><span class="small">about ${pools(pk.volume).toLocaleString("en-GB")} Olympic pools</span></div>
      <div><span class="small">Deepest water</span><b class="num">${pk.maxDepth.toFixed(1)} m</b></div>
      <div><span class="small">Peak</span><b class="num">hour ${res.peakAt}</b></div>
    </div>
    <p class="small" id="proj-buildings">${buildingsText(res)}</p>
    <div class="card player">
      <div class="player-row">
        <button class="btn primary inline" id="proj-play" data-act="proj-play" aria-pressed="${!!PROJ.timer}">${PROJ.timer ? "❚❚ Pause" : "▶ Play"}</button>
        <input id="proj-slider" type="range" min="0" max="${n - 1}" value="${PROJ.hour}" aria-label="Hour">
      </div>
      <p class="player-now" id="proj-now" aria-live="polite">${projHourText(res, PROJ.hour)}</p>
      <div class="legend">${FLOODSIM.CLASSES.map(c => `<span><i class="sw w${c.k}"></i>${esc(c.n)}</span>`).join("")}</div>
    </div>
    <div class="card"><h2>Where the water went</h2>
      <ul class="plain small"><li>Rain that ran off the ground: <b>${esc(fmtVolume(b.rain))}</b>${b.river > 0 ? `; water from the rising river: <b>${esc(fmtVolume(b.river))}</b>` : ""}${b.sea < 0 ? `; water pushed in by the sea: <b>${esc(fmtVolume(-b.sea))}</b>` : ""}.</li>
        <li>Flowed out of the area${b.sea > 0 ? " or into the sea" : ""}: <b>${esc(fmtVolume(b.edge + Math.max(0, b.sea)))}</b>. Still standing at hour ${n - 1}: <b>${esc(fmtVolume(b.stored))}</b>.</li></ul>
      <div class="toolbar"><button class="sbtn" data-act="proj-export">Save as a replay file</button></div>
    </div>
    <details class="card"><summary><b>How this projection was made</b></summary>
      <ul class="plain">${projectionAssumptions(res).map(a => `<li class="small">${esc(a)}</li>`).join("")}</ul>
      <p class="small muted">A projection shows what this storm would do on today's ground. Follow official warnings: they know the drains, dams and defences.</p></details>`;
}
function projectMapView() {
  const t = projectionTarget(UI.place);
  const avail = projectionAvailable();
  return {show: "none", streets: avail, terrain: avail, three: true, pitch: 60,
    sel: t ? {ll: t.ll, n: t.n} : null, fit: t ? {ll: t.ll, z: avail ? 13.6 : 11} : {ll: [0, 15], z: 1.6}};
}

/* ---------- live cards on Ghana's and Nigeria's detailed pages ---------- */
function liveCardsFor(p) {
  const c = placeCountry(p);
  if (!c) return "";
  if (p.type === "country") return `<button class="btn" data-act="reach" data-k="${c}">Flood and heat reach across ${esc(countryName(c))}</button>`;
  const ll = placeCenter(p).ll;
  return heatCardHtml(ll, c) + floodCardHtml(ll, c, p.type === "hotspot");
}

/* ---- features/analytics.js ---- */
/* ===== Analytics: anonymous visit tracking (collector) and the admin dashboard =====
   Collector: each signed-in visitor who is allowed to write keeps ONE document, analytics/<their id>
   (database rule: they write only their own; only Editors and the Owner read the collection).
   A visit is one opening of the page. Pages, searches, feature use and the exit point are merged into
   that visit with debounced update() calls, so two open tabs never overwrite each other.
   Live "online now" uses room presence, which is never stored. Device Do Not Track / GPC is respected. */
const AN = {
  on: false, ref: null, sid: null, sess: null, timer: null, busy: false, again: false, dirty: false,
  lastKey: "", qTimer: null, pendingQ: null, room: null, peers: [], peersSub: null,
  rows: null, loading: false, err: false, range: "7", staff: false
};
const AN_MAX_SESS = 30, AN_MAX_PAGES = 60, AN_MAX_Q = 30, AN_FLUSH_MS = 5000, AN_DUR_CAP = 4 * 3600;
const AN_PRIVATE = () => navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;

function anDevice() {
  const w = Math.min(window.screen?.width || innerWidth, innerWidth);
  const touch = !!window.matchMedia?.("(pointer: coarse)").matches;
  return w < 700 ? "phone" : touch ? "tablet" : "computer";
}
function anTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { return ""; } }
function anSecs() { return Math.max(0, Math.round((Date.now() - Date.parse(AN.sess.start)) / 1000)); }

/* where the viewer is right now, as [screen, place key, risk level shown] */
function anWhere() {
  const s = UI.mode === "simple" ? UI.screen : UI.mode;
  const p = UI.mode === "simple" && UI.place && s !== "where" ? UI.place : null;
  const key = p ? (p.type === "water" ? "water:" + p.idx : p.type + ":" + p.id) : "";
  let lvl = "";
  if (p && s === "answer" && UI.when !== "past") { const hs = placeHot(p); if (hs.length) lvl = maxLevel(hs.map(h => riskOf(h, simpleCtx(UI.when)))); }
  return [s, key, lvl];
}

async function anStart(db, uid) {
  if (!db || !uid || AN.on || AN_PRIVATE()) return;
  const ref = db.doc("analytics/" + uid);
  let prev = null;
  try { const s = await ref.get(); prev = s.exists ? s.data() : null; } catch (e) { return; }
  const now = new Date().toISOString();
  const old = prev && prev.s && typeof prev.s === "object" ? prev.s : {};
  const keys = Object.keys(old).filter(k => old[k] && old[k].start).sort((a, b) => String(old[a].start).localeCompare(String(old[b].start)));
  AN.sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  AN.sess = {start: now, end: now, dev: anDevice(), w: innerWidth, lang: String(navigator.language || "").slice(0, 12), tz: anTz(),
    dark: !!window.matchMedia?.("(prefers-color-scheme: dark)").matches, ret: keys.length > 0, staff: false,
    n: 0, pages: [], q: [], ev: {}, exit: null, warn: 0};
  AN.lastKey = ""; anRecord(anWhere());   /* the first page goes out with the first write */
  try {
    if (!prev || keys.length >= AN_MAX_SESS) {
      const keep = {}; keys.slice(-(AN_MAX_SESS - 1)).forEach(k => keep[k] = old[k]);
      keep[AN.sid] = AN.sess;
      await ref.set({first: prev?.first || now, last: now, s: keep});
    } else await ref.update({last: now, s: {[AN.sid]: AN.sess}});
  } catch (e) { return; }   /* this viewer can't write (view-only access): stay silent, count nothing */
  AN.ref = ref; AN.on = true;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") anFlush(true); });
  window.addEventListener("pagehide", () => anFlush(true));
  anPage();   /* in case the page changed while the first write was in flight */
}
async function anRoom(room) {
  if (!room || AN_PRIVATE()) return;
  AN.room = room;
  anPresence();
}
function anPresence() {
  if (!AN.room) return;
  const [s, p] = anWhere();
  const c = UI.mode === "simple" && UI.place ? placeCountry(UI.place) || "" : "";
  AN.room.presence({s, p, c, d: anDevice()}).catch(() => {});
}

function anDirty() {
  AN.dirty = true;
  if (!AN.timer) AN.timer = setTimeout(() => { AN.timer = null; anFlush(false); }, AN_FLUSH_MS);
}
async function anFlush(final) {
  if (!AN.on) return;
  if (final) { clearTimeout(AN.timer); AN.timer = null; AN.dirty = true; }
  if (!AN.dirty) return;
  if (AN.busy) { AN.again = true; return; }       /* one write at a time per document */
  AN.busy = true; AN.dirty = false;
  AN.sess.staff = AN.sess.staff || AUTH.anyAdmin() || !!AUTH.agency();   /* roles can arrive after the visit starts */
  AN.sess.end = new Date().toISOString();
  try { await AN.ref.update({last: AN.sess.end, s: {[AN.sid]: AN.sess}}); }
  catch (e) { if (e?.code === "invalid_argument" || e?.code === "not_granted" || e?.code === "revoked") AN.on = false; }
  AN.busy = false;
  if (AN.again) { AN.again = false; AN.dirty = true; anFlush(false); }
}

/* called after every render */
function anPage() {
  const w = anWhere(), key = w.join("|");
  if (key === AN.lastKey) return;
  anPresence();
  if (!AN.on) { AN.lastKey = key; return; }
  if (anRecord(w)) anDirty();
}
/* adds one page view to the current visit; false if it is the page already recorded */
function anRecord(w) {
  const key = w.join("|");
  if (key === AN.lastKey) return false;
  AN.lastKey = key;
  const S = AN.sess;
  S.n++;
  if (S.pages.length < AN_MAX_PAGES) S.pages.push([w[0], w[1], w[2], anSecs()]);
  S.exit = [w[0], w[1]];
  S.staff = AUTH.anyAdmin() || !!AUTH.agency();
  if (w[0] === "answer" && UI.place) {
    const ar = UI.place.type === "area" ? UI.place.id : UI.place.type === "hotspot" ? IX.byId[UI.place.id]?.r : null;
    if (activeAlerts(placeCountry(UI.place), ar).length) S.warn = 1;
  }
  return true;
}
/* searches are recorded once the visitor stops typing */
function anSearch(q, n) {
  if (!AN.on) return;
  clearTimeout(AN.qTimer);
  AN.pendingQ = {q, n};
  AN.qTimer = setTimeout(anSearchCommit, 1200);
}
function anSearchCommit() {
  clearTimeout(AN.qTimer); AN.qTimer = null;
  const p = AN.pendingQ; AN.pendingQ = null;
  if (!p || !AN.on) return;
  const q = norm(p.q).slice(0, 60);
  if (q.length < 2) return;
  const Q = AN.sess.q, last = Q[Q.length - 1];
  if (last && (last[0] === q || q.startsWith(last[0]) && anSecs() - last[2] < 20)) { last[0] = q; last[1] = p.n; anDirty(); return; }   /* refining the same search */
  if (Q.length < AN_MAX_Q) { Q.push([q, p.n, anSecs(), 0]); anDirty(); }
}
function anPick() {
  if (!AN.on) return;
  if (AN.pendingQ) anSearchCommit();
  const Q = AN.sess.q, last = Q[Q.length - 1];
  if (last && !last[3]) { last[3] = 1; anDirty(); }
}
function anEvent(name) {
  if (!AN.on) return;
  const k = String(name).toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30);
  if (!k) return;
  AN.sess.ev[k] = (AN.sess.ev[k] || 0) + 1;
  anDirty();
}
const AN_EVENTS = {contribute: "open-contribute", "alert-me": "follow-place", alerts: "open-alerts", "wa-push": "turn-on-push", "wa-install": "install-app", "wa-locate": "use-location", speak: "read-aloud", ts: "text-size", three: "3d", copy: "copy-number", "map-safe": "safe-places", year: "past-year", "to-map": "open-map", "go-status": "data-status"};
function anClick(act, el) {
  if (!AN.on) return;
  if (act === "open" && UI.q) anPick();
  let k = AN_EVENTS[act];
  if (act === "when") k = "when-" + el.dataset.k;
  if (act === "mode") k = "mode-" + el.dataset.k;
  if (act === "toggle" && !UI.open[el.dataset.k]) k = "open-" + el.dataset.k;
  if (act === "alert-me" && UI.place && isMine(UI.place)) k = null;   /* count follows, not unfollows */
  if (k) anEvent(k);
}

/* ===================== admin dashboard ===================== */
const AN_RANGES = [["1", "Last 24 hours"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"], ["all", "All time"]];
const AN_SCREENS = {contribute: "Contribute", alerts: "Alerts", where: "Choosing a place", answer: "Risk answer", map: "Map", status: "Data status", expert: "Expert view", agency: "Agency portal", admin: "Admin"};
const AN_FEATURES = [["open-contribute", "Opened Contribute"], ["follow-place", "Followed a place for alerts"], ["open-alerts", "Opened Alerts"], ["install-app", "Installed the web app"], ["turn-on-push", "Turned on phone alerts"], ["use-location", "Used their location"],
  ["open-todo", "Opened “What should I do?”"], ["open-safe", "Opened “Nearest safe place”"], ["copy-number", "Copied an emergency number"], ["open-map", "Opened the map"],
  ["safe-places", "Showed safe places on the map"], ["read-aloud", "Used Read aloud"], ["text-size", "Changed text size"], ["3d", "Switched the map to 3D"],
  ["when-today", "Checked “Today”"], ["when-season", "Checked “Next 3 months”"], ["when-past", "Looked at past floods"], ["past-year", "Picked a past-flood year"],
  ["data-status", "Opened data status"], ["mode-expert", "Opened Expert view"], ["mode-agency", "Opened the Agency portal"]];
/* device time zone → country (the browser gives no location without asking, and Open Tracker never asks) */
const TZ_COUNTRY = {
  "Africa/Accra": "Ghana", "Africa/Lagos": "Nigeria", "Africa/Abidjan": "Côte d'Ivoire or Ghana", "Africa/Lome": "Togo", "Africa/Porto-Novo": "Benin",
  "Africa/Ouagadougou": "Burkina Faso", "Africa/Niamey": "Niger", "Africa/Dakar": "Senegal", "Africa/Bamako": "Mali", "Africa/Conakry": "Guinea",
  "Africa/Freetown": "Sierra Leone", "Africa/Monrovia": "Liberia", "Africa/Banjul": "Gambia", "Africa/Bissau": "Guinea-Bissau", "Africa/Nouakchott": "Mauritania",
  "Africa/Douala": "Cameroon", "Africa/Ndjamena": "Chad", "Africa/Kinshasa": "DR Congo", "Africa/Nairobi": "Kenya", "Africa/Johannesburg": "South Africa",
  "Africa/Cairo": "Egypt", "Atlantic/Cape_Verde": "Cabo Verde", "Europe/London": "United Kingdom", "Europe/Dublin": "Ireland", "Europe/Paris": "France",
  "Europe/Berlin": "Germany", "Europe/Amsterdam": "Netherlands", "America/New_York": "United States", "America/Chicago": "United States",
  "America/Denver": "United States", "America/Los_Angeles": "United States", "America/Toronto": "Canada", "Asia/Dubai": "United Arab Emirates",
  "Asia/Kolkata": "India", "Asia/Shanghai": "China", "Australia/Sydney": "Australia"
};
function anCountry(tz) { return TZ_COUNTRY[tz] || (tz ? "Other (" + tz.split("/")[0] + ")" : "Unknown"); }
const AN_HOUR_FMT = {};
function anLocalHour(iso, tz) {
  try {
    const f = AN_HOUR_FMT[tz] || (AN_HOUR_FMT[tz] = new Intl.DateTimeFormat("en-GB", {hour: "numeric", hourCycle: "h23", timeZone: tz || undefined}));
    return +f.format(new Date(iso)) % 24;
  } catch (e) { return new Date(iso).getHours(); }
}
function anPlaceLabel(key) {
  const i = key.indexOf(":"), t = key.slice(0, i), id = key.slice(i + 1);
  if (t === "water") return (FT.waters[+id]?.n || "River search");
  const p = {type: t, id};
  return (t === "hotspot" ? IX.byId[id] : t === "area" ? IX.areaById[id] : FT.countries[id]) ? placeName(p) : key;
}
function anExitLabel(e) { return e ? (AN_SCREENS[e[0]] || e[0]) + (e[1] ? " · " + anPlaceLabel(e[1]) : "") : "Left within seconds"; }

async function anLoad() {
  if (!DB.api || AN.loading) return;
  AN.loading = true;
  try {
    const snap = await DB.api.collection("analytics").get();
    AN.rows = snap.docs.map(d => ({id: d.id, d: d.data()}));
    AN.err = false;
  } catch (e) { AN.err = true; }
  AN.loading = false;
  if (UI.mode === "admin" && UI.admin.tab === "analytics") render();
}
function anSubscribePeers() {
  if (!AN.room || AN.peersSub) return;
  try {
    AN.peersSub = AN.room.onPeers(ch => {
      AN.peers = ch.peers.filter(p => p.kind === "viewer");
      const box = $("#an-live"); if (box) box.innerHTML = anLiveHtml();
    }, () => {});
  } catch (e) {}
}

function anSessions() {
  const days = AN.range === "all" ? Infinity : +AN.range;
  const from = Date.now() - days * 864e5;
  const out = [];
  (AN.rows || []).forEach(({id, d}) => Object.values(d?.s || {}).forEach(s => {
    if (!s || typeof s.start !== "string") return;
    const t = Date.parse(s.start); if (!(t >= from)) return;
    if (s.staff && !AN.staff) return;
    out.push(Object.assign({}, s, {vid: id, t, dur: Math.min(AN_DUR_CAP, Math.max(0, (Date.parse(s.end) - t) / 1000 || 0))}));
  }));
  return out.sort((a, b) => a.t - b.t);
}
const tally = () => { const m = new Map(); return {add(k, v = 1) { m.set(k, (m.get(k) || 0) + v); }, top(n) { return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n); }, size: () => m.size, get: k => m.get(k) || 0}; };
function anCompute(S) {
  const r = {visits: S.length, visitors: new Set(S.map(s => s.vid)).size, ret: S.filter(s => s.ret).length};
  const durs = S.map(s => s.dur).sort((a, b) => a - b);
  r.avgDur = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
  r.medDur = durs.length ? durs[Math.floor(durs.length / 2)] : 0;
  r.ppv = S.length ? S.reduce((a, s) => a + (s.n || 0), 0) / S.length : 0;
  r.bounce = S.length ? S.filter(s => (s.n || 0) <= 1).length / S.length : 0;
  r.warn = S.filter(s => s.warn).length;
  const T = k => (r[k] = tally());
  ["screens", "places", "regions", "countries", "levels", "loc", "lang", "dev", "exits", "terms", "picks", "zero", "feat"].forEach(T);
  r.hours = Array(24).fill(0);
  r.days = new Map();
  let nq = 0;
  S.forEach(s => {
    const day = new Date(s.t); day.setHours(0, 0, 0, 0); r.days.set(+day, (r.days.get(+day) || 0) + 1);
    r.hours[anLocalHour(s.start, s.tz)]++;
    r.loc.add(anCountry(s.tz)); r.lang.add(String(s.lang || "unknown").split("-")[0] || "unknown"); r.dev.add(s.dev || "unknown");
    r.exits.add(anExitLabel(s.exit));
    const seenP = new Set();
    (s.pages || []).forEach(([sc, p, lv]) => {
      r.screens.add(AN_SCREENS[sc] || sc);
      if (p && !seenP.has(p)) {
        seenP.add(p); r.places.add(p);
        const t = p.slice(0, p.indexOf(":")), id = p.slice(p.indexOf(":") + 1);
        const reg = t === "area" ? id : t === "hotspot" ? IX.byId[id]?.r : null; if (reg) r.regions.add(reg);
        const c = t === "country" ? id : reg ? IX.areaById[reg]?.c : null; if (c) r.countries.add(c);
      }
      if (sc === "answer" && lv) r.levels.add(lv);
    });
    (s.q || []).forEach(([q, n, , pick]) => { nq++; r.terms.add(q); if (pick) r.picks.add(q); if (!n) r.zero.add(q); });
    Object.keys(s.ev || {}).forEach(k => r.feat.add(k));
  });
  r.nq = nq;
  const has = f => S.filter(f).length;
  const pg = (s, sc) => (s.pages || []).some(p => p[0] === sc);
  r.funnel = [["Opened Open Tracker", S.length], ["Chose a place", has(s => (s.pages || []).some(p => p[1]))], ["Saw a risk answer", has(s => pg(s, "answer"))],
    ["Read what to do or safe places", has(s => s.ev?.["open-todo"] || s.ev?.["open-safe"] || s.ev?.["safe-places"])], ["Opened the map", has(s => pg(s, "map"))],
    ["Copied an emergency number", has(s => s.ev?.["copy-number"])]];
  return r;
}

/* ---- small charts: SVG and CSS bars styled by theme tokens ---- */
function anCols(vals, labels, title) {
  const W = 640, H = 150, n = vals.length, max = Math.max(1, ...vals), bw = W / n;
  const step = Math.max(1, Math.ceil(n / 12));
  return `<figure class="anchart"><svg viewBox="0 0 ${W} ${H + 20}" role="img" aria-label="${esc(title)}">
    ${vals.map((v, i) => `<rect x="${(i * bw + bw * .12).toFixed(1)}" y="${(H - v / max * H).toFixed(1)}" width="${(bw * .76).toFixed(1)}" height="${(v / max * H).toFixed(1)}" rx="2"><title>${esc(labels[i])}: ${v}</title></rect>`).join("")}
    ${labels.map((l, i) => i % step ? "" : `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H + 15}" text-anchor="middle">${esc(l)}</text>`).join("")}
  </svg><figcaption class="small muted">Highest: ${max === 1 && !vals.some(v => v) ? 0 : max}</figcaption></figure>`;
}
function anBars(rows, total, label = x => x) {
  if (!rows.length) return `<p class="muted small">No data yet for this period.</p>`;
  const max = Math.max(...rows.map(r => r[1]));
  return `<ul class="anbars">${rows.map(([k, v]) => `<li><span class="l">${esc(label(k))}</span><span class="b"><i style="width:${(v / max * 100).toFixed(1)}%"></i></span><span class="v num">${v}${total ? ` <span class="muted">${Math.round(v / total * 100)}%</span>` : ""}</span></li>`).join("")}</ul>`;
}
function anDur(s) { s = Math.round(s); return s < 60 ? s + " s" : s < 3600 ? Math.floor(s / 60) + " min " + (s % 60) + " s" : (s / 3600).toFixed(1) + " h"; }
function anLiveHtml() {
  const P = AN.peers;
  if (!AN.room) return `<p class="small muted">Live counts aren't available in this view.</p>`;
  const sc = tally(), pl = tally();
  P.forEach(p => { sc.add(AN_SCREENS[p.presence?.s] || "Opening the page"); if (p.presence?.p) pl.add(String(p.presence.p)); });
  return `<div class="kpis"><div class="kpi live"><b class="num">${P.length}</b><span>online now</span></div><div class="kpi"><b class="num">${P.filter(p => p.presence?.d === "phone").length}</b><span>on phones</span></div><div class="kpi"><b class="num">${P.filter(p => p.guest).length}</b><span>from outside your organisation</span></div></div>
    <div class="grid2"><div><h3>What they're looking at</h3>${anBars(sc.top(8), P.length)}</div><div><h3>Places open right now</h3>${anBars(pl.top(8), 0, anPlaceLabel)}</div></div>`;
}

function adAnalytics() {
  anSubscribePeers();
  if (!AN.rows && !AN.err) { anLoad(); return `<div class="card"><p>Loading analytics…</p></div>`; }
  if (AN.err) return `<div class="card"><p>Analytics could not be loaded.</p><button class="sbtn" data-act="an-reload">Try again</button></div>`;
  const S = anSessions(), r = anCompute(S);
  const days = AN.range === "all" ? Math.min(90, Math.max(7, Math.ceil((Date.now() - (S[0]?.t || Date.now())) / 864e5) + 1)) : Math.max(+AN.range, 1);
  const dayVals = [], dayLabels = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); dayVals.push(r.days.get(+d) || 0); dayLabels.push(d.toLocaleDateString("en-GB", {day: "numeric", month: "short"})); }
  const termRows = r.terms.top(15);
  const confirm = UI.admin.confirm && UI.admin.confirm.k?.startsWith("an-") ? confirmBox() : "";
  return `
  <div class="card"><h2>Analytics</h2>
    <p class="small muted">Who is counted: everyone signed in whose access lets them use Open Tracker's shared data (members of your organisation, Contributors and Editors). Viewers from outside and visitors who aren't signed in can't be counted by this platform. Devices that ask not to be tracked are not counted. No names are stored or shown.</p>
    <div class="toolbar">
      <label class="field" style="min-width:180px"><span>Period</span><select id="an-range">${AN_RANGES.map(([k, n]) => `<option value="${k}" ${AN.range === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
      <div class="checks" style="align-self:end"><label><input type="checkbox" id="an-staff" ${AN.staff ? "checked" : ""}> Include staff and agency visits</label></div>
      <button class="sbtn" data-act="an-reload" style="align-self:end">Refresh</button>
      <button class="sbtn" data-act="an-export" style="align-self:end">Download visits (CSV)</button>
    </div>
  </div>
  <div class="card"><h2>Right now</h2><div id="an-live">${anLiveHtml()}</div></div>
  <div class="card"><h2>Visits</h2>
    <div class="kpis">
      <div class="kpi"><b class="num">${r.visits}</b><span>visits</span></div>
      <div class="kpi"><b class="num">${r.visitors}</b><span>different people</span></div>
      <div class="kpi"><b class="num">${r.visits ? Math.round(r.ret / r.visits * 100) : 0}%</b><span>returning visits</span></div>
      <div class="kpi"><b class="num">${anDur(r.avgDur)}</b><span>average time (median ${anDur(r.medDur)})</span></div>
      <div class="kpi"><b class="num">${r.ppv.toFixed(1)}</b><span>pages per visit</span></div>
      <div class="kpi"><b class="num">${Math.round(r.bounce * 100)}%</b><span>left after one page</span></div>
      <div class="kpi"><b class="num">${r.nq}</b><span>searches</span></div>
      <div class="kpi"><b class="num">${r.warn}</b><span>visits that saw an official warning</span></div>
    </div>
    <h3>Visits per day</h3>${anCols(dayVals, dayLabels, "Visits per day")}
    <h3>Busiest hours (visitor's local time)</h3>${anCols(r.hours, r.hours.map((_, h) => String(h).padStart(2, "0") + ":00"), "Visits by hour")}
  </div>
  <div class="grid2">
    <div class="card"><h2>Where visitors are</h2><p class="small muted">From the device time zone.</p>${anBars(r.loc.top(12), r.visits)}<h3>Languages</h3>${anBars(r.lang.top(6), r.visits, l => ({en: "English", fr: "French", ha: "Hausa", yo: "Yoruba", ig: "Igbo", tw: "Twi", ak: "Akan", ee: "Ewe"})[l] || l)}</div>
    <div class="card"><h2>Places people checked</h2>${anBars(r.countries.top(4), 0, c => FT.countries[c]?.n || c)}<h3>Regions and states</h3>${anBars(r.regions.top(10), 0, id => IX.areaById[id]?.n || id)}<h3>Pages for a place</h3>${anBars(r.places.top(10), 0, anPlaceLabel)}</div>
  </div>
  <div class="grid2">
    <div class="card"><h2>What people searched for</h2>
      ${termRows.length ? `<div class="tablewrap"><table><thead><tr><th>Search</th><th class="n">Times</th><th class="n">Picked a result</th></tr></thead><tbody>${termRows.map(([q, n]) => `<tr><td>${esc(q)}</td><td class="n">${n}</td><td class="n">${Math.round(r.picks.get(q) / n * 100)}%</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted small">No searches yet for this period.</p>`}
      <h3>Searches that found nothing</h3><p class="small muted">Add these as “other names” on a flood area so people find it next time.</p>${anBars(r.zero.top(10))}
    </div>
    <div class="card"><h2>Where people left off</h2><p class="small muted">The last page of each visit.</p>${anBars(r.exits.top(10), r.visits)}<h3>Most viewed pages</h3>${anBars(r.screens.top(8))}</div>
  </div>
  <div class="grid2">
    <div class="card"><h2>Journey</h2><p class="small muted">How far visits got.</p>${anBars(r.funnel, r.visits)}<h3>Risk levels people were shown</h3>${anBars(r.levels.top(4), 0, k => LEVELS.find(l => l.k === k)?.word || k)}</div>
    <div class="card"><h2>Features used</h2><p class="small muted">Visits that used each feature.</p>${anBars(AN_FEATURES.map(([k, n]) => [n, r.feat.get(k)]).filter(x => x[1]).sort((a, b) => b[1] - a[1]), r.visits)}<h3>Devices</h3>${anBars(r.dev.top(4), r.visits, d => ({phone: "Phone", tablet: "Tablet", computer: "Computer"})[d] || d)}</div>
  </div>
  ${AUTH.can("backup.manage") ? `<div class="card"><h2>Keep analytics tidy</h2><p class="small muted">Each person keeps their last ${AN_MAX_SESS} visits. You can also remove older records.</p>
    <div class="toolbar"><button class="sbtn" data-act="ad-ask" data-k="an-prune">Delete visits older than 90 days</button><button class="sbtn danger" data-act="ad-ask" data-k="an-clear">Delete all analytics</button></div>${confirm}</div>` : ""}`;
}
function anCsv() {
  const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const vids = new Map();
  const head = ["start", "end", "seconds", "visitor", "returning", "device", "language", "time_zone", "country_from_time_zone", "pages", "path", "searches", "left_off", "features", "saw_warning", "staff"];
  return [head.join(",")].concat(anSessions().map(s => {
    if (!vids.has(s.vid)) vids.set(s.vid, "V" + (vids.size + 1));   /* visitor ids are replaced by V1, V2 … in exports */
    return [s.start, s.end, Math.round(s.dur), vids.get(s.vid), s.ret ? "yes" : "no", s.dev, s.lang, s.tz, anCountry(s.tz), s.n,
      (s.pages || []).map(p => p[0] + (p[1] ? ":" + p[1] : "")).join(" > "), (s.q || []).map(q => q[0]).join(" | "), anExitLabel(s.exit),
      Object.keys(s.ev || {}).join(" "), s.warn ? "yes" : "no", s.staff ? "yes" : "no"].map(cell).join(",");
  })).join("\n");
}
/* admin housekeeping; both are recorded in the audit log */
async function anHousekeep(all) {
  REPO.require(AUTH.can("backup.manage"), "delete analytics");
  const snap = await DB.api.collection("analytics").get();
  const cut = Date.now() - 90 * 864e5;
  let removed = 0;
  for (const d of snap.docs) {
    const v = d.data() || {}, s = v.s || {};
    if (all) { removed += Object.keys(s).length; await DB.api.doc("analytics/" + d.id).delete(); continue; }
    const keep = {}; Object.entries(s).forEach(([k, x]) => { if (x && Date.parse(x.start) >= cut) keep[k] = x; else removed++; });
    if (Object.keys(keep).length === Object.keys(s).length) continue;
    if (Object.keys(keep).length) await DB.api.doc("analytics/" + d.id).set(Object.assign({}, v, {s: keep}));
    else await DB.api.doc("analytics/" + d.id).delete();
  }
  await REPO.audit(all ? "deleted all analytics" : "deleted analytics older than 90 days", "analytics", "-", null, {visits: removed});
  AN.rows = null;
  toast(`Removed ${removed} visit${removed === 1 ? "" : "s"}.`);
}
async function anAct(act) {
  try {
    if (act === "an-reload") { AN.rows = null; AN.err = false; return render(); }
    if (act === "an-export") return saveFile(`opentracker-visits-${new Date().toISOString().slice(0, 10)}.csv`, anCsv(), "text/csv");
  } catch (e) { toast(errText(e)); }
}

/* ---- core/approval.js ---- */
/* ===== Approval of agency changes =====
   When approval is on (the default), nothing an agency submits goes live until an administrator approves it:
   - agency posts (warnings, forecasts, dam status, readings, phone notifications) wait for a decision stored in
     "approvals", a collection only administrators can write. The decision is tied to a fingerprint of the post,
     so if the agency edits a post after approval it goes back to waiting.
   - data edits by agency-linked editors become change requests in "changes"; approving one applies it.
   Administrators can turn approval off for everyone, or mark single agencies as trusted. */
const APPROVAL = {
  /* settings.approval = {on: boolean, agencies: {<agency id>: "auto" | "review"}} */
  needed(agencyId) {
    const ap = settings().approval || {};
    if (ap.on === false) return false;
    return (ap.agencies || {})[agencyId] !== "auto";
  },
  /* the agency the current editor acts for, if their edits must be approved */
  gate() {
    const a = AUTH.agency();
    if (!a || AUTH.isOwner || AUTH.can("approvals.manage") || AUTH.can("users.manage")) return null;
    return APPROVAL.needed(a.id) ? a : null;
  },

  /* ----- posts ----- */
  fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); },
  postKey(uid, postId) { return "p" + APPROVAL.fnv(uid + "/" + postId) + APPROVAL.fnv(postId + "#" + uid); },
  fingerprint(p) {
    const f = ["type", "level", "areas", "msg", "expires", "push", "zone", "mm24", "mm72", "dam", "status", "notice", "station", "kind", "value", "ll"];
    return APPROVAL.fnv(JSON.stringify(f.map(k => p[k] === undefined ? null : p[k])));
  },
  /* "live" | "pending" | "rejected" for a raw agency post */
  postStatus(p, uid, agency) {
    if (!APPROVAL.needed(agency.id)) return "live";
    const d = data("approvals").find(x => x.id === APPROVAL.postKey(uid, p.id));
    if (!d || d.fp !== APPROVAL.fingerprint(p)) return "pending";
    return d.ok ? "live" : "rejected";
  },
  pendingPosts() {
    const pm = publisherMap(), out = [];
    Object.entries(AG.posts).forEach(([uid, l]) => { const a = pm[uid]; if (a) l.forEach(p => { if (!p.retracted && APPROVAL.postStatus(p, uid, a) === "pending") out.push(Object.assign({}, p, {uid, agency: a})); }); });
    return out.sort((x, y) => String(x.at).localeCompare(String(y.at)));
  },
  async decidePost(uid, postId, ok) {
    REPO.require(AUTH.can("approvals.manage"), "approve agency posts");
    const p = (AG.posts[uid] || []).find(x => x.id === postId);
    if (!p) throw new AccessError("That post is no longer available.");
    const id = APPROVAL.postKey(uid, postId);
    await DB.api.collection("approvals").doc(id).set({uid, post: postId, fp: APPROVAL.fingerprint(p), ok: !!ok, at: new Date().toISOString(), by: DB.uid || null});
    await REPO.audit(ok ? "approved agency post" : "rejected agency post", "agencyPosts", uid + "/" + postId, null, {agency: publisherMap()[uid]?.n || "", summary: postSummary(p)});
  },

  /* ----- data change requests ----- */
  async propose(op, coll, rec, agency) {
    const rid = op === "delete" ? rec : rec.id;
    const before = data(coll).find(r => r.id === rid) || null;
    const body = {op, coll, rid, rec: op === "delete" ? null : clone(rec), before, agency: agency.id, by: DB.uid || null, at: new Date().toISOString(), status: "pending"};
    const ref = DB.api.collection("changes").doc();
    await ref.set(body);
    await REPO.audit("proposed " + (op === "delete" ? "deletion" : before ? "edit" : "addition"), coll, rid, before, body.rec);
    toast("Sent to an administrator for approval.");
  },
  pendingChanges() { return data("changes").filter(c => c.status === "pending").sort((a, b) => String(a.at).localeCompare(String(b.at))); },
  async decideChange(id, ok, note) {
    REPO.require(AUTH.can("approvals.manage"), "approve agency changes");
    const ch = data("changes").find(c => c.id === id);
    if (!ch || ch.status !== "pending") throw new AccessError("That request has already been decided.");
    if (ok) {
      if (!SCHEMA[ch.coll]) throw new AccessError("That section can't be changed this way.");
      if (ch.op === "delete") await REPO.del(ch.coll, ch.rid, {approvedFrom: ch});
      else {
        const rec = Object.assign(clone(ch.rec), {id: ch.rid});
        if (ch.coll === "notifications") rec.at = new Date().toISOString();   /* a notification goes out when it is approved */
        await REPO.set(ch.coll, rec, {approvedFrom: ch});
      }
    }
    const body = Object.assign({}, ch, {status: ok ? "approved" : "rejected", note: String(note || "").slice(0, 300), decidedBy: DB.uid || null, decidedAt: new Date().toISOString()});
    delete body.id;
    await DB.api.collection("changes").doc(id).set(body);
    if (!ok) await REPO.audit("rejected change", ch.coll, ch.rid, null, {agency: ch.agency, note: body.note});
  },
  async setPolicy(next) {
    REPO.require(AUTH.can("approvals.manage"), "change approval settings");
    const before = settings().approval || null;
    const body = Object.assign({}, DB.cfg || {}, {approval: next, updated: new Date().toISOString(), updatedBy: DB.uid || null});
    await DB.api.doc("config/settings").set(body);
    await REPO.audit("changed approval settings", "settings", "approval", before, next);
  }
};

/* ---------- admin: Approvals tab ---------- */
function adApprovals() {
  const ap = settings().approval || {on: true, agencies: {}};
  const posts = APPROVAL.pendingPosts(), changes = APPROVAL.pendingChanges();
  ensureNames(posts.map(p => p.uid).concat(changes.map(c => c.by)));
  const agName = id => agencies().find(a => a.id === id)?.n || id;
  return `
  <div class="card"><h2>Approval settings</h2>
    <label class="switch"><input type="checkbox" id="ap-on" ${ap.on !== false ? "checked" : ""}> <span><b>Agency changes need approval</b><br><span class="small muted">When on, posts, notifications and data changes from agencies wait here until an administrator approves them. When off, agencies publish directly.</span></span></label>
    ${ap.on !== false ? `<details class="howto"><summary><b>Trusted agencies</b> (publish without approval)</summary>
      <div class="tablewrap"><table><thead><tr><th>Agency</th><th>Their changes</th></tr></thead><tbody>
      ${agencies().map(a => `<tr><td>${esc(a.n)}</td><td><select data-ap-agency="${esc(a.id)}" aria-label="Approval for ${esc(a.n)}"><option value="review" ${(ap.agencies || {})[a.id] !== "auto" ? "selected" : ""}>Need approval</option><option value="auto" ${(ap.agencies || {})[a.id] === "auto" ? "selected" : ""}>Go live at once</option></select></td></tr>`).join("")}
      </tbody></table></div></details>` : ""}
  </div>
  <div class="card"><h2>Agency posts waiting (${posts.length})</h2>
    <p class="small muted">Warnings, phone notifications, rain forecasts, dam status and readings sent from the Agency portal.</p>
    <div class="tablewrap"><table><thead><tr><th>Sent</th><th>Agency</th><th>By</th><th>Type</th><th>Details</th><th></th></tr></thead><tbody>
    ${posts.map(p => `<tr><td class="num small">${esc(fmtDate(p.at))}</td><td>${esc(p.agency.n)}</td><td>${esc(nameOf(p.uid))}</td><td>${esc((POST_TYPES.find(x => x[0] === p.type) || [0, p.type])[1])}${p.push ? " + phone alert" : ""}</td><td class="small">${esc(postSummary(p))}</td>
      <td style="white-space:nowrap"><button class="sbtn primary" data-act="ap-post" data-ok="1" data-uid="${esc(p.uid)}" data-id="${esc(p.id)}">Approve</button> <button class="sbtn danger" data-act="ap-post" data-ok="0" data-uid="${esc(p.uid)}" data-id="${esc(p.id)}">Reject</button></td></tr>`).join("") || `<tr><td colspan="6">Nothing waiting.</td></tr>`}
    </tbody></table></div></div>
  <div class="card"><h2>Data changes waiting (${changes.length})</h2>
    <p class="small muted">Additions, corrections and deletions made by agency editors, including public notifications.</p>
    <div class="stack">${changes.map(c => {
      const cur = data(c.coll).find(r => r.id === c.rid) || null;
      const moved = JSON.stringify(cur) !== JSON.stringify(c.before);
      return `<div class="notice-card"><div class="nc-head"><b>${esc(c.op === "delete" ? "Delete" : c.before ? "Change" : "Add")} · ${esc(tabLabel(c.coll))} · ${esc(c.rid)}</b><span class="small">${esc(fmtDate(c.at))}</span></div>
        <p class="small">From <b>${esc(agName(c.agency))}</b> (${esc(nameOf(c.by))})${c.op !== "delete" && c.before ? " · Fields: " + esc(changedKeys(c.before, c.rec) || "none") : ""}</p>
        ${moved ? `<p class="small" style="color:var(--high)">This record has changed since the request was made. Check before approving.</p>` : ""}
        <details><summary class="small">Show before and after</summary><div class="grid2"><div><b>Before</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(c.before, null, 1))}</pre></div><div><b>After</b><pre class="formula" style="white-space:pre-wrap">${esc(JSON.stringify(c.rec, null, 1))}</pre></div></div></details>
        <div class="toolbar"><input id="ap-note-${esc(c.id)}" placeholder="Note to the agency (optional)" maxlength="300" aria-label="Note"><button class="sbtn primary" data-act="ap-change" data-ok="1" data-id="${esc(c.id)}">Approve</button><button class="sbtn danger" data-act="ap-change" data-ok="0" data-id="${esc(c.id)}">Reject</button></div></div>`;
    }).join("") || `<p>Nothing waiting.</p>`}</div></div>`;
}
/* agency editors see what they sent and what happened to it */
function myChangesHtml() {
  const mine = data("changes").filter(c => c.by === DB.uid).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 20);
  if (!APPROVAL.gate() && !mine.length) return "";
  return `<div class="card"><h2>Your changes</h2>${APPROVAL.gate() ? `<p class="small muted">Your changes go live after an administrator approves them.</p>` : ""}
    <div class="tablewrap"><table><thead><tr><th>Sent</th><th>Section</th><th>Record</th><th>Change</th><th>Status</th></tr></thead><tbody>
    ${mine.map(c => `<tr><td class="num small">${esc(fmtDate(c.at))}</td><td>${esc(tabLabel(c.coll))}</td><td class="small">${esc(c.rid)}</td><td>${c.op === "delete" ? "Delete" : c.before ? "Change" : "Add"}</td><td>${{pending: "Waiting for approval", approved: "Approved", rejected: "Not approved"}[c.status] || esc(c.status)}${c.note ? `<br><span class="small muted">${esc(c.note)}</span>` : ""}</td></tr>`).join("") || `<tr><td colspan="5">Nothing sent yet.</td></tr>`}
    </tbody></table></div></div>`;
}
async function approvalAct(act, el) {
  try {
    if (act === "ap-post") { await APPROVAL.decidePost(el.dataset.uid, el.dataset.id, el.dataset.ok === "1"); toast(el.dataset.ok === "1" ? "Approved. It is live now." : "Rejected."); }
    if (act === "ap-change") { await APPROVAL.decideChange(el.dataset.id, el.dataset.ok === "1", $("#ap-note-" + CSS.escape(el.dataset.id))?.value); toast(el.dataset.ok === "1" ? "Approved and applied." : "Rejected."); }
    render();
  } catch (e) { toast(errText(e)); }
}
async function approvalChange(el) {
  try {
    const ap = clone(settings().approval || {on: true, agencies: {}});
    ap.agencies = ap.agencies || {};
    if (el.id === "ap-on") ap.on = el.checked;
    if (el.dataset.apAgency) ap.agencies[el.dataset.apAgency] = el.value;
    await APPROVAL.setPolicy(ap);
    toast("Approval settings saved.");
  } catch (e) { toast(errText(e)); render(); }
}

/* ---- ui/main.js ---- */
/* ===== Router, events, database start-up ===== */
let lastFitKey = "";
function allowedModes() {
  const modes = [["simple", "Simple"], ["expert", "Expert"]];
  if (DB.api && DB.uid) modes.push(["agency", "Agency"]);
  if (AUTH.anyAdmin()) modes.push(["admin", "Admin"]);
  return modes;
}
function header() {
  const modes = allowedModes();
  $("#modes").innerHTML = modes.map(([k, n]) => `<button data-act="mode" data-k="${k}" aria-pressed="${UI.mode === k}">${n}</button>`).join("");
  const n = unseenCount(), bell = $("#bell");
  if (bell) { bell.innerHTML = `${ICON.bell}<span>Alerts</span>${n ? `<span class="count num">${n > 9 ? "9+" : n}</span>` : ""}`; bell.setAttribute("aria-label", n ? `Alerts, ${n} new` : "Alerts"); bell.setAttribute("aria-pressed", String(UI.mode === "simple" && UI.screen === "alerts")); }
  const ts = document.documentElement.classList.contains("ts-2") ? 2 : document.documentElement.classList.contains("ts-1") ? 1 : 0;
  $("#ts").textContent = ["Text: normal", "Text: large", "Text: larger"][ts];
}

function render() {
  reindex();
  if (!allowedModes().some(m => m[0] === UI.mode)) UI.mode = "simple";   /* access removed while open */
  const root = $("#app");
  let html = "";
  const st = settings();
  const top = st.notice ? `<div class="notice info">${ICON.info}<div>${esc(st.notice)}</div></div>` : "";
  if (UI.mode === "expert") html = `<h1>Expert view</h1>${viewExpert()}`;
  else if (UI.mode === "admin") html = viewAdmin();
  else if (UI.mode === "agency") html = viewAgency();
  else if (UI.screen === "answer") html = viewAnswer();
  else if (UI.screen === "map") html = viewMap();
  else if (UI.screen === "status") html = viewStatus();
  else if (UI.screen === "alerts") html = viewAlerts();
  else if (UI.screen === "contribute") html = viewContribute();
  else if (UI.screen === "outlook") html = viewOutlook();
  else if (UI.screen === "replays") html = viewReplays();
  else if (UI.screen === "world") html = viewWorld();
  else if (UI.screen === "reach") html = viewReach(UI.reachCc);
  else if (UI.screen === "project") html = viewProject();
  else html = viewWhere();
  header();   /* after the view, so counts reflect what it just marked as seen */
  const wide = UI.mode === "expert" || UI.mode === "admin";
  root.innerHTML = `<main class="wrap ${wide ? "wide" : ""}" id="main" tabindex="-1">${top}${html}</main>`;
  const holder = $("#map");
  if (holder) {
    MAPV.onPick = id => {
      if (UI.mode === "expert") { UI.exSel = id; const h = IX.byId[id]; if (h) mapFly(h.ll, 11); render(); }
      else { UI.place = {type: "hotspot", id}; UI.screen = "answer"; UI.open = {}; render(); window.scrollTo(0, 0); }
    };
    MAPV.onPickPlace = id => { if (worldPlace(id)) { reachStop(); UI.place = {type: "wp", id}; UI.open = {}; go("answer"); } };
    MAPV.onPickCountry = c => { if (worldCountry(c)) openReach(c); };
    mapMount(holder);
    const simple = UI.mode === "simple", replaying = simple && UI.screen === "replays";
    const reachCc = simple && UI.screen === "reach" ? UI.reachCc : simple && UI.screen === "answer" && UI.place?.type === "wc" ? UI.place.id : null;
    const view = UI.mode === "expert" ? expertMapView() : replaying ? replayMapView() : reachCc ? reachMapView(reachCc)
      : simple && UI.screen === "world" ? worldMapView() : simple && UI.screen === "project" ? projectMapView() : simpleMapView();
    const key = UI.mode + UI.screen + JSON.stringify(UI.mode === "expert" ? [UI.ex.country, UI.ex.area] : replaying ? UI.replay.id : reachCc || UI.place);
    mapUpdate(view, key !== lastFitKey || !MAPV.ready);
    lastFitKey = key;
    if (replaying) replayShow(UI.replay.i);
    else if (simple && UI.screen === "project" && PROJ.result) projShow(PROJ.hour);   /* the page was redrawn: lay the water back on */
    else if (simple && UI.screen === "project") mapProjection(null);
    else if (simple && UI.screen === "map" && UI.show === "past") yearOverlay();
  }
  anPage();
}
const ALL_FIT = {bounds: [[-3.4, 4.2], [14.7, 13.9]], ll: [5.6, 8.6], z: 4.6};
function pastLayer(hs, year) {
  const agg = {};
  data("events").filter(e => yearMatch(e, year)).forEach(e => (e.ids || []).forEach(id => {
    if (!IX.byId[id] || (hs && !hs.has(id))) return;
    const a = agg[id] = agg[id] || {h: IX.byId[id], n: 0, y: 0};
    a.n++; a.y = Math.max(a.y, e.year || 0);
  }));
  return Object.values(agg).map(a => Object.assign(a, {recent: a.y ? Math.min(.95, .35 + .6 * Math.max(0, a.y - 2000) / (NOW.getFullYear() - 2000)) : .3}));
}
function simpleMapView() {
  const p = UI.place, c = p ? placeCountry(p) : null;
  const hs = c ? IX.hot.filter(h => h.c === c) : IX.hot;
  const ctx = simpleCtx(UI.when === "past" ? "3d" : UI.when);
  const sel = p && p.type === "hotspot" ? IX.byId[p.id] : null;
  return {
    show: UI.show, three: UI.three,
    hot: hs.map(h => ({h, r: computeRisk(h, ctx)})),
    past: pastLayer(c ? new Set(hs.map(h => h.id)) : null, UI.year),
    reach: UI.when === "year" ? hs.map(h => { const r = outlookFor(h); return {ll: h.ll, km: r.reach, level: r.level}; }) : [],
    safe: data("safe").filter(s => !c || s.c === c), roads: data("roads").filter(s => !c || s.c === c),
    dams: UI.show === "risk" ? data("dams").filter(d => !c || d.c === c) : [],
    sel: sel ? {ll: sel.ll, n: sel.n} : null,
    fit: p ? placeCenter(p) : ALL_FIT
  };
}
function expertMapView() {
  const e = UI.ex;
  const rows = exHot();
  const sel = UI.exSel && IX.byId[UI.exSel];
  let fit = ALL_FIT;
  if (e.area) fit = placeCenter({type: "area", id: e.area});
  else if (e.country !== "ALL") fit = placeCenter({type: "country", id: e.country});
  const reach = e.horizon === "year" ? rows.map(({h, r}) => ({ll: h.ll, km: r.reach, level: r.level})) : [];
  return {show: "risk", three: UI.three, hot: rows, reach, past: [], safe: [], roads: [], dams: data("dams").filter(d => e.country === "ALL" || d.c === e.country), sel: sel ? {ll: sel.ll, n: sel.n} : null, fit, pitch: 55};
}

function go(screen) {
  if (screen !== "project") projStop();
  UI.screen = screen; render(); window.scrollTo(0, 0); const m = $("#main"); if (m) m.focus({preventScroll: true});
}
/* a country's flood and heat reach: Ghana and Nigeria keep their own screen for it, others use their country page */
function openReach(cc) {
  reachStop(); RCH.day = 0; UI.open = {};
  if (DETAILED.has(cc)) { UI.reachCc = cc; go("reach"); }
  else { UI.place = {type: "wc", id: cc}; go("answer"); }
}

const ADMIN_ACTS = ["ad-", "pp-", "role-", "rq-", "post-", "audit-"];
document.addEventListener("click", async ev => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  anClick(act, el);
  if (act.startsWith("an-")) { ev.preventDefault(); return anAct(act); }
  if (act.startsWith("ap-")) { ev.preventDefault(); return approvalAct(act, el); }
  if (act.startsWith("ct-")) { ev.preventDefault(); return contribAct(act, el); }
  if (ADMIN_ACTS.some(p => act.startsWith(p))) { ev.preventDefault(); return adminAct(act, el); }
  if (act.startsWith("ag-")) { ev.preventDefault(); return agencyAct(act, el); }
  if (act.startsWith("wa-")) { ev.preventDefault(); return window.WEBAPP?.act(act, el); }
  switch (act) {
    case "home": UI.mode = "simple"; UI.pickCountry = null; UI.place = null; UI.q = ""; UI.open = {}; go("where"); break;
    case "mode":
      UI.mode = el.dataset.k;
      if (UI.mode === "expert") UI.three = true;
      if (UI.mode === "simple") UI.three = false;
      lastFitKey = ""; render(); window.scrollTo(0, 0); break;
    case "country": UI.pickCountry = el.dataset.id; go("where"); break;
    case "back-country": UI.pickCountry = null; go("where"); break;
    case "open": {
      const t = el.dataset.type;
      reachStop();
      UI.place = t === "water" ? {type: "water", idx: +el.dataset.idx} : {type: t, id: el.dataset.id};
      if (t === "country") UI.pickCountry = el.dataset.id;
      UI.open = {}; UI.q = "";
      if (UI.when === "past" && UI.screen !== "answer") UI.when = "3d";
      go("answer"); break;
    }
    case "back":
      reachStop();
      if (["map", "status", "alerts", "contribute", "outlook", "replays", "project", "reach"].includes(UI.screen)) { replayStop(); yearsStop(); go(UI.place ? "answer" : "where"); }
      else if (UI.screen === "world") go("where");
      else if (UI.place?.type === "wp") { UI.place = countryPlace(worldPlace(UI.place.id)?.c || ""); if (!UI.place.id) UI.place = null; go(UI.place ? "answer" : "where"); }
      else {
        const c = UI.place ? placeCountry(UI.place) : null;
        UI.pickCountry = c && DETAILED.has(c) && UI.place?.type !== "country" ? c : null;
        UI.place = null; go("where");
      }
      break;
    case "when": UI.when = el.dataset.k; render(); break;
    case "toggle": UI.open[el.dataset.k] = !UI.open[el.dataset.k]; render(); break;
    case "to-map": UI.show = UI.when === "past" ? "past" : "risk"; go("map"); break;
    case "map-safe": UI.show = "safe"; go("map"); break;
    case "change-where": UI.q = ""; UI.pickCountry = UI.place ? placeCountry(UI.place) : null; go("where"); break;
    case "year": yearsStop(); UI.year = el.dataset.y; render(); break;
    case "zoom": mapZoom(+el.dataset.d); break;
    case "three": UI.three = !UI.three; render(); break;
    case "copy": {
      const v = el.dataset.v;
      try { await navigator.clipboard.writeText(v); toast("Copied " + v); }
      catch (e) { const n = el.parentElement.querySelector(".n"); if (n) { const r = document.createRange(); r.selectNodeContents(n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } toast("Number selected. Copy it from your keyboard menu."); }
      break;
    }
    case "go-status": UI.prevScreen = UI.screen; go("status"); break;
    case "ts": {
      const d = document.documentElement, cur = d.classList.contains("ts-2") ? 2 : d.classList.contains("ts-1") ? 1 : 0, nx = (cur + 1) % 3;
      d.classList.remove("ts-1", "ts-2"); if (nx) d.classList.add("ts-" + nx);
      try { localStorage.setItem("ft-ts", nx ? String(nx) : ""); } catch (e) {}
      header(); if (MAPV.map) MAPV.map.resize(); break;
    }
    case "speak": speak(); break;
    case "alerts": document.querySelectorAll(".livealert").forEach(x => x.remove()); UI.mode = "simple"; go("alerts"); break;
    case "contribute": UI.mode = "simple"; UI.contrib = {type: el.dataset.k || null, sent: false, noPlace: false}; go("contribute"); break;
    case "contrib-type": UI.contrib = {type: el.dataset.k || null, sent: false, noPlace: UI.contrib.noPlace}; render(); break;
    case "outlook": UI.mode = "simple"; go("outlook"); break;
    case "replays": UI.mode = "simple"; UI.replay = {id: null, i: 0}; go("replays"); break;
    case "replay-open": replayStop(); yearsStop(); UI.mode = "simple"; UI.replay = {id: el.dataset.id, i: 0}; go("replays"); break;
    case "replay-close": replayStop(); UI.replay = {id: null, i: 0}; go("replays"); break;
    case "replay-play": replayToggle(); break;
    case "replay-step": replayStop(); replayShow(UI.replay.i + +el.dataset.d); break;
    case "years-map": { const ys = yearRange(); UI.show = "past"; UI.year = ys.length ? String(ys[ys.length - 1]) : "all"; go("map"); break; }
    case "years-play": yearsToggle(); break;
    case "open-outlook": UI.place = {type: "hotspot", id: el.dataset.id}; UI.when = "year"; UI.open = {}; go("answer"); break;
    case "outlook-map": UI.place = {type: "country", id: el.dataset.k}; UI.pickCountry = el.dataset.k; UI.when = "year"; UI.show = "risk"; go("map"); break;
    case "contrib-noplace": UI.contrib.noPlace = true; render(); break;
    case "world": UI.mode = "simple"; reachStop(); go("world"); break;
    case "reach": UI.mode = "simple"; openReach(el.dataset.k); break;
    case "reach-day": reachStop(); RCH.day = +el.dataset.k; render(); break;
    case "reach-play": reachToggle(); break;
    case "project": UI.mode = "simple"; go("project"); break;
    case "proj-sc": if (PROJ.status !== "loading" && PROJ.status !== "running") { PROJ.sc = el.dataset.k; render(); } break;
    case "proj-area": if (PROJ.status !== "loading" && PROJ.status !== "running") { PROJ.area = el.dataset.k; render(); } break;
    case "proj-run": runProjection(UI.place); break;
    case "proj-play": projToggle(); break;
    case "proj-export": projExport(); break;
    case "live-close": document.querySelectorAll(".livealert").forEach(x => x.remove()); break;
    case "alert-me": if (UI.place) { toggleMine(UI.place); render(); } break;
    case "unfollow": MY.places = MY.places.filter(k => k !== el.dataset.k); saveMy(); window.WEBAPP?.sync(); render(); break;
    case "ex-reset": UI.ex = Object.assign(UI.ex, {month: NOW.getMonth(), rain: "auto", mm: 100, tide: "normal", dams: {}, types: {rain: true, river: true, dam: true, coast: true}, minLevel: "low", horizon: "3d"}); render(); break;
    case "ex-focus": { const h = IX.byId[el.dataset.id]; UI.exSel = el.dataset.id; if (h) { mapFly(h.ll, 11.5); } render(); document.getElementById("mapbox")?.scrollIntoView({behavior: "smooth", block: "center"}); break; }
  }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Enter" && ev.target.matches("tr[data-act]")) ev.target.click();
});
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.id === "rp-slider") { replayStop(); replayShow(+t.value); return; }
  if (t.id === "proj-slider") { projStop(); projShow(+t.value); return; }
  if (t.id === "q") { UI.q = t.value; const r = $("#results"); if (r) r.innerHTML = resultsHtml(); anSearch(UI.q, search(UI.q).length); }
  if (t.id === "mm") { const b = t.closest("label")?.querySelector("b"); if (b) b.textContent = t.value + " mm"; }
  if (t.id === "pp-q") { peopleSearch(t.value); return; }
  if (t.id === "au-q") { UI.admin.auditF.q = t.value; const pos = t.selectionStart; render(); const n = $("#au-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
  if (t.id === "ad-q") { UI.admin.q = t.value; const pos = t.selectionStart; render(); const n = $("#ad-q"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
});
document.addEventListener("change", ev => {
  const t = ev.target;
  if (t.id === "year-slider") { yearsStop(); const ys = yearRange(); UI.year = String(ys[+t.value] ?? "all"); render(); return; }
  if (t.id === "country-pick" && worldCountry(t.value)) { UI.mode = "simple"; openReach(t.value); return; }
  if (t.id === "rp-import" && t.files?.[0]) { replayImportFile(t.files[0]); t.value = ""; return; }
  if (t.id === "hz-import" && t.files?.[0]) { liveImport(t.files[0]); t.value = ""; return; }
  if (t.id === "show") { yearsStop(); UI.show = t.value; render(); return; }
  if (t.id === "when" && UI.screen === "map") { UI.when = t.value; render(); return; }
  if (t.dataset.ex) {
    const k = t.dataset.ex, v = t.value;
    UI.ex[k] = ["month", "mm"].includes(k) ? +v : v;
    if (k === "country") UI.ex.area = "";
    render(); return;
  }
  if (t.dataset.dam !== undefined && UI.mode === "expert") { if (t.value) UI.ex.dams[t.dataset.dam] = t.value; else delete UI.ex.dams[t.dataset.dam]; render(); return; }
  if (t.dataset.type && UI.mode === "expert") { UI.ex.types[t.dataset.type] = t.checked; render(); return; }
  if (t.id === "ad-import" && t.files?.[0]) { adminImport(t.files[0]); t.value = ""; return; }
  if (t.id === "pp-role") { UI.admin.people.role = t.value; return; }
  if (t.id === "pp-agency") { UI.admin.people.agency = t.value; return; }
  if (t.id === "au-coll" || t.id === "au-by") { UI.admin.auditF[t.id === "au-coll" ? "coll" : "by"] = t.value; render(); return; }
  if (t.dataset.member) { memberChange(t); return; }
  if (t.id === "ap-on" || t.dataset.apAgency) { approvalChange(t); return; }
  if (t.id === "ct-filter") { AD_CONTRIB.filter = t.value; render(); return; }
  if (t.id === "an-range") { AN.range = t.value; render(); return; }
  if (t.id === "an-staff") { AN.staff = t.checked; render(); return; }
});
document.addEventListener("submit", ev => {
  const f = ev.target;
  if (["ad-form", "ad-model", "ad-role"].includes(f.id)) { ev.preventDefault(); adminSubmit(f); }
  else if (f.id === "ag-form" || f.id === "ag-request") { ev.preventDefault(); agencySubmit(f); }
  else if (f.id === "contrib-form") { ev.preventDefault(); submitContribution(f); }
  else if (f.id === "ro-form") { ev.preventDefault(); replayOutlineSubmit(f); }
  else ev.preventDefault();   /* no form ever leaves the page */
});

function speak() {
  const synth = window.speechSynthesis;
  if (!synth) { toast("Reading aloud isn't available on this device."); return; }
  if (synth.speaking) { synth.cancel(); return; }
  const m = $("#main"); if (!m) return;
  const parts = [m.querySelector("h1")?.innerText, m.querySelector("#say")?.innerText, ...[...m.querySelectorAll(".why li")].map(l => l.innerText)].filter(Boolean);
  const txt = parts.length > 1 ? parts.join(". ") : m.innerText.slice(0, 600);
  try { const u = new SpeechSynthesisUtterance(txt); u.lang = "en-GB"; u.rate = .95; synth.speak(u); } catch (e) { toast("Reading aloud isn't available on this device."); }
}

/* shared database: editors' changes reach every signed-in viewer live */
let dataTimer = null;
function afterData() {
  clearTimeout(dataTimer);
  dataTimer = setTimeout(() => {
    syncAgencySubs(); syncContribSub();
    const a = document.activeElement;
    /* never redraw under someone who is typing; their next action redraws with the new data */
    const editing = a && a.matches?.("textarea, input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range])");
    if (editing || (UI.mode === "admin" && UI.admin.edit)) { reindex(); header(); checkNewNotices(); return; }
    render();
    checkNewNotices();
  }, 120);
}
async function startDb() {
  if (window.WEBAPP) { await window.WEBAPP.start(); render(); return; }   /* self-hosted web app: data comes from its server */
  if (!window.claude || typeof window.claude.use !== "function") return;
  let db = null, user = null, dl = null, room = null;
  try { [db, user, dl, room] = await Promise.all(["db", "user", "downloads", "room"].map(n => claude.use(n).catch(() => null))); } catch (e) {}
  DB.user = user; DB.downloads = dl;
  if (user) {
    try { DB.canEdit = !!(await user.canEdit()); } catch (e) {}
    try { DB.uid = await user.id(); } catch (e) {}
    try { AUTH.isOwner = !!(await user.isOwner()); } catch (e) {}
  }
  if (!db) { render(); return; }
  DB.api = db;
  db.doc("config/settings").onSnapshot(s => { DB.cfg = s.exists ? s.data() : null; afterData(); }, () => {});
  /* "members" is readable by Editors only; for everyone else that subscription simply errors and stays empty */
  COLLS.forEach(k => db.collection(k).onSnapshot(s => { DB.cols[k] = s.docs.map(d => Object.assign({}, d.data(), {id: d.id})); afterData(); }, () => {}));
  syncAgencySubs(); syncContribSub();
  render();
  anRoom(room);
  anStart(db, DB.uid);
}

render();
startDb();
