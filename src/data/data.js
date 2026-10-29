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
