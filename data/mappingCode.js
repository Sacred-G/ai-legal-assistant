
const codeList = [
    { label: "All", value: "" },
    { label: "03.01.00.00", value: "1" },
    { label: "03.02.00.00", value: "2" },
    { label: "03.03.00.00", value: "3" },
    { label: "03.04.00.00", value: "4" },
    { label: "03.05.00.00", value: "5" },
    { label: "03.06.00.00", value: "6" },
    { label: "04.01.00.00", value: "7" },
    { label: "04.02.00.00", value: "8" },
    { label: "04.03.01.00", value: "9" },
    { label: "04.03.02.00", value: "10" },
    { label: "04.04.00.00", value: "11" },
    { label: "05.01.00.00", value: "12" },
    { label: "05.02.00.00", value: "13" },
    { label: "05.03.00.00", value: "14" },
    { label: "06.01.00.00", value: "15" },
    { label: "06.02.00.00", value: "16" },
    { label: "06.03.00.00", value: "17" },
    { label: "06.03.00.00", value: "18" },
    { label: "06.04.00.00", value: "19" },
    { label: "06.04.00.00", value: "20" },
    { label: "06.05.00.00", value: "21" },
    { label: "07.01.00.00", value: "22" },
    { label: "07.02.00.00", value: "23" },
    { label: "07.03.00.00", value: "24" },
    { label: "07.04.00.00", value: "25" },
    { label: "07.05.00.00", value: "26" },
    { label: "07.05.00.00", value: "27" },
    { label: "07.05.00.00", value: "28" },
    { label: "07.05.00.00", value: "29" },
    { label: "07.05.00.00", value: "30" },
    { label: "07.05.00.00", value: "31" },
    { label: "07.05.00.00", value: "32" },
    { label: "08.01.00.00", value: "33" },
    { label: "08.02.00.00", value: "34" },
    { label: "08.03.00.00", value: "35" },
    { label: "08.04.00.00", value: "36" },
    { label: "08.05.00.00", value: "37" },
    { label: "09.01.00.00", value: "38" },
    { label: "09.01.00.00", value: "39" },
    { label: "09.01.00.00", value: "40" },
    { label: "10.01.00.00", value: "41" },
    { label: "10.01.00.00", value: "42" },
    { label: "10.01.00.00", value: "43" },
    { label: "10.01.00.00", value: "44" },
    { label: "10.01.00.00", value: "45" },
    { label: "10.01.00.00", value: "46" },
    { label: "10.01.00.00", value: "47" },
    { label: "10.01.00.00", value: "48" },
    { label: "10.01.00.00", value: "49" },
    { label: "11.01.01.00", value: "50" },
    { label: "11.01.02.00", value: "51" },
    { label: "11.02.01.00", value: "52" },
    { label: "11.02.02.00", value: "53" },
    { label: "11.03.01.00", value: "54" },
    { label: "11.03.02.00", value: "55" },
    { label: "11.03.03.00", value: "56" },
    { label: "11.03.04.00", value: "57" },
    { label: "12.01.00.00", value: "58" },
    { label: "12.02.00.00", value: "59" },
    { label: "12.03.00.00", value: "60" },
    { label: "13.01.00.00", value: "61" },
    { label: "13.02.00.00", value: "62" },
    { label: "13.03.00.00", value: "63" },
    { label: "13.04.00.00", value: "64" },
    { label: "13.05.00.00", value: "65" },
    { label: "13.06.00.00", value: "66" },
    { label: "13.07.01.00", value: "67" },
    { label: "13.07.02.00", value: "68" },
    { label: "13.07.02.00", value: "69" },
    { label: "13.07.03.00", value: "70" },
    { label: "13.07.04.00", value: "71" },
    { label: "13.07.05.00", value: "72" },
    { label: "13.07.06.01", value: "73" },
    { label: "13.07.06.02", value: "74" },
    { label: "13.07.07.00", value: "75" },
    { label: "13.07.08.00", value: "76" },
    { label: "13.07.08.00", value: "77" },
    { label: "13.07.08.00", value: "78" },
    { label: "13.07.09.00", value: "79" },
    { label: "13.08.00.00", value: "80" },
    { label: "13.09.00.00", value: "81" },
    { label: "13.09.00.00", value: "82" },
    { label: "13.10.01.00", value: "83" },
    { label: "13.10.02.00", value: "84" },
    { label: "13.10.03.00", value: "85" },
    { label: "13.10.04.00", value: "86" },
    { label: "13.11.01.01", value: "87" },
    { label: "13.11.01.02", value: "88" },
    { label: "13.11.01.03", value: "89" },
    { label: "13.11.02.01", value: "90" },
    { label: "13.11.02.02", value: "91" },
    { label: "13.11.02.03", value: "92" },
    { label: "13.12.01.01", value: "93" },
    { label: "13.12.01.02", value: "94" },
    { label: "13.12.02.01", value: "95" },
    { label: "13.12.02.02", value: "96" },
    { label: "13.12.03.01", value: "97" },
    { label: "13.12.03.02", value: "98" },
    { label: "14.01.00.00", value: "99" },
    { label: "15.01.01.00", value: "100" },
    { label: "15.01.02.01", value: "101" },
    { label: "15.01.02.02", value: "102" },
    { label: "15.01.02.03", value: "103" },
    { label: "15.01.02.04", value: "104" },
    { label: "15.01.02.05", value: "105" },
    { label: "15.01.02.06", value: "106" },
    { label: "15.02.01.00", value: "107" },
    { label: "15.02.02.01", value: "108" },
    { label: "15.02.02.02", value: "109" },
    { label: "15.02.02.03", value: "110" },
    { label: "15.02.02.04", value: "111" },
    { label: "15.02.02.05", value: "112" },
    { label: "15.02.02.06", value: "113" },
    { label: "15.03.01.00", value: "114" },
    { label: "15.03.02.01", value: "115" },
    { label: "15.03.02.02", value: "116" },
    { label: "15.03.02.03", value: "117" },
    { label: "15.03.02.04", value: "118" },
    { label: "15.03.02.05", value: "119" },
    { label: "15.03.02.06", value: "120" },
    { label: "15.04.01.00", value: "121" },
    { label: "15.04.02.00", value: "122" },
    { label: "15.04.03.00", value: "123" },
    { label: "15.04.04.00", value: "124" },
    { label: "15.04.05.00", value: "125" },
    { label: "15.04.06.00", value: "126" },
    { label: "15.04.07.00", value: "127" },
    { label: "15.05.01.00", value: "128" },
    { label: "15.05.02.00", value: "129" },
    { label: "15.05.03.00", value: "130" },
    { label: "16.01.01.01", value: "131" },
    { label: "16.01.01.02", value: "132" },
    { label: "16.01.01.03", value: "133" },
    { label: "16.01.01.04", value: "134" },
    { label: "16.01.02.01", value: "135" },
    { label: "16.01.02.02", value: "136" },
    { label: "16.01.02.03", value: "137" },
    { label: "16.01.02.04", value: "138" },
    { label: "16.01.02.05", value: "139" },
    { label: "16.01.03.00", value: "140" },
    { label: "16.01.04.00", value: "141" },
    { label: "16.01.05.00", value: "142" },
    { label: "16.02.01.00", value: "143" },
    { label: "16.02.02.00", value: "144" },
    { label: "16.03.01.00", value: "145" },
    { label: "16.03.02.00", value: "146" },
    { label: "16.04.01.00", value: "147" },
    { label: "16.04.02.00", value: "148" },
    { label: "16.05.01.00", value: "149" },
    { label: "16.05.02.00", value: "150" },
    { label: "16.05.03.00", value: "151" },
    { label: "16.05.04.00", value: "152" },
    { label: "16.06.01.01", value: "153" },
    { label: "16.06.01.02", value: "154" },
    { label: "16.06.01.03", value: "155" },
    { label: "16.06.01.04", value: "156" },
    { label: "16.06.02.01", value: "157" },
    { label: "16.06.02.02", value: "158" },
    { label: "16.06.02.03", value: "159" },
    { label: "16.06.02.04", value: "160" },
    { label: "16.06.03.01", value: "161" },
    { label: "16.06.03.02", value: "162" },
    { label: "16.06.03.03", value: "163" },
    { label: "16.06.03.04", value: "164" },
    { label: "16.06.04.01", value: "165" },
    { label: "16.06.04.02", value: "166" },
    { label: "16.06.04.03", value: "167" },
    { label: "16.06.04.04", value: "168" },
    { label: "16.06.05.01", value: "169" },
    { label: "16.06.05.02", value: "170" },
    { label: "16.06.05.03", value: "171" },
    { label: "16.06.05.04", value: "172" },
    { label: "17.01.01.00", value: "173" },
    { label: "17.01.02.01", value: "174" },
    { label: "17.01.02.02", value: "175" },
    { label: "17.01.03.00", value: "176" },
    { label: "17.01.04.00", value: "177" },
    { label: "17.01.05.00", value: "178" },
    { label: "17.01.06.00", value: "179" },
    { label: "17.01.07.00", value: "180" },
    { label: "17.01.08.00", value: "181" },
    { label: "17.02.10.00", value: "182" },
    { label: "17.03.01.00", value: "183" },
    { label: "17.03.02.00", value: "184" },
    { label: "17.03.02.00", value: "185" },
    { label: "17.03.02.00", value: "186" },
    { label: "17.03.02.00", value: "187" },
    { label: "17.03.02.00", value: "188" },
    { label: "17.03.03.00", value: "189" },
    { label: "17.03.04.00", value: "190" },
    { label: "17.03.05.00", value: "191" },
    { label: "17.03.06.00", value: "192" },
    { label: "17.03.10.01", value: "193" },
    { label: "17.03.10.02", value: "194" },
    { label: "17.03.10.03", value: "195" },
    { label: "17.03.10.04", value: "196" },
    { label: "17.04.10.00", value: "197" },
    { label: "17.05.01.00", value: "198" },
    { label: "17.05.02.00", value: "199" },
    { label: "17.05.02.00", value: "200" },
    { label: "17.05.02.00", value: "201" },
    { label: "17.05.02.00", value: "202" },
    { label: "17.05.03.00", value: "203" },
    { label: "17.05.04.00", value: "204" },
    { label: "17.05.05.00", value: "205" },
    { label: "17.05.06.00", value: "206" },
    { label: "17.05.10.01", value: "207" },
    { label: "17.05.10.02", value: "208" },
    { label: "17.05.10.03", value: "209" },
    { label: "17.05.10.04", value: "210" },
    { label: "17.05.10.05", value: "211" },
    { label: "17.05.10.06", value: "212" },
    { label: "17.05.10.07", value: "213" },
    { label: "17.05.10.08", value: "214" },
    { label: "17.05.10.09", value: "215" },
    { label: "17.06.10.00", value: "216" },
    { label: "17.07.01.00", value: "217" },
    { label: "17.07.02.00", value: "218" },
    { label: "17.07.02.00", value: "219" },
    { label: "17.07.02.00", value: "220" },
    { label: "17.07.02.00", value: "221" },
    { label: "17.07.02.00", value: "222" },
    { label: "17.07.03.00", value: "223" },
    { label: "17.07.04.00", value: "224" },
    { label: "17.07.05.00", value: "225" },
    { label: "17.07.06.00", value: "226" },
    { label: "17.07.10.01", value: "227" },
    { label: "17.07.10.02", value: "228" },
    { label: "17.08.01.00", value: "229" },
    { label: "17.08.02.00", value: "230" },
    { label: "17.08.03.00", value: "231" },
    { label: "17.08.04.00", value: "232" },
    { label: "17.08.05.00", value: "233" },
    { label: "17.08.06.00", value: "234" },
    { label: "17.08.10.01", value: "235" },
    { label: "17.08.10.02", value: "236" },
    { label: "17.08.10.03", value: "237" },
    { label: "17.08.10.04", value: "238" },
    { label: "17.08.10.05", value: "239" },
    { label: "17.08.10.06", value: "240" },
    { label: "17.08.10.07", value: "241" },
    { label: "17.09.01.00", value: "242" },
    { label: "17.09.02.00", value: "243" },
    { label: "17.09.03.00", value: "244" },
    { label: "17.09.04.00", value: "245" },
    { label: "17.09.05.00", value: "246" },
    { label: "17.09.06.00", value: "247" },
    { label: "17.09.07.00", value: "248" },
];
export default codeList;
