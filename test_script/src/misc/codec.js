var rsaProfile = {},
    rsa = null,
    rsa_hash, rsa_hashB64;

var do_login = function(e, key) {
    "use strict";
    
    if(!key){
        var lf = document.loginform;
        rsaProfile = cryptCore.login(lf.passwd.value, lf.magik_num.value, false);
        lf.magik_num.value = lf.passwd.value = '';

        rsa_hash = rsaProfile.publicKeyPairPrintableHash;
        rsa_hashB64 = rsaProfile.publicKeyPairPrintable;

        ssSet(boardHostName + 'magic_desu_numbers', rsaProfile);
    }else{
        cryptCore.login(null, null, key);
    }

    $('#identi').html(rsa_hashB64).identicon5({
        rotate: true,
        size: 64
    });
    $('#identi').append('<br/><br/><i style="color: #009;">'+rsa_hashB64+'</i>');
    //$('#identi').append('<br/><br/><i style="color: #090;">'+rsa_hash+'</i>');    
};

var do_encode = function() {
    "use strict";

    prev_to = $('#hidbord_cont_type').val();
    prev_cont = $('#hidbord_cont_direct').val();

    var to_group = null;

    if(prev_to.indexOf('group_') === 0){
        to_group = prev_to.substring(6);
    }

    var payLoad = {};

    if(!container_data){
        alert('Image needed. Please select one.');
        return false;
    }

    if(!("publicKeyPairPrintable" in rsaProfile)){
        alert('Please log in.');
        return false;   
    }

    payLoad.text = $('#hidbord_reply_text').val();
    payLoad.ts = Math.floor((new Date()).getTime() / 1000);

    var keys = {};

    for (var c in contacts) {
        if(c == rsa_hashB64) continue;

        if(prev_to == 'direct' && c == prev_cont){
            keys[c] = contacts[c].key;
            continue;
        }
        
        if('hide' in contacts[c] && contacts[c].hide == 1){
            continue;
        }

        if(to_group !== null && contacts[c].groups && $.isArray(contacts[c].groups) && contacts[c].groups.indexOf(to_group) != -1){
            keys[c] = contacts[c].key;
        }

        if(prev_to == 'direct' || to_group !== null){
            continue;
        }

        keys[c] = contacts[c].key;
    }

    var p = encodeMessage(payLoad,keys, 0);
    var testEncode = decodeMessage([0,p]);

    if(!testEncode){
        alert('Error in crypt module!');
        return false;
    }

    var lastRand = stringToByteArray(String(Math.round(Math.random() * 1e6)));

    var final_container = jpegEmbed(container_data, p);
    if(!final_container) return false;

    var out_file = appendBuffer(final_container, lastRand);
    
    var compressedB64 = arrayBufferDataUri(out_file);

    sendBoardForm(out_file);
};

var do_decode = function(message, msgPrepend, thumb, fdate, post_id) {
    "use strict";
    var msg = JSON.parse(message.text);
    var out_msg = {
        post_id: post_id,
        id: message.msgHash,
        txt: {
            ts: message.timestamp,
            msg: msg.text
        },
        keyid: message.sender || '',
        pubkey: message.sender || '',
        status: 'OK',
        to: message.msgContacts.sort(),
        contactsHidden: message.contactsHidden,
        contactsNum: message.contactsNum,
        senderHidden: message.senderHidden,
    };

    push_msg(out_msg, msgPrepend, thumb);
    return out_msg;
};


var processedJpegs = {};

var processJpgUrl = function(jpgURL, thumbURL, post_id, cb){
    "use strict";

    if(processedJpegs[jpgURL]){
        
        if(processedJpegs[jpgURL].id != 'none'){
            $("#msg_" + processedJpegs[jpgURL].id).addClass('hidbord_msg_new');
        }
        
        console.log('from cache');

        if (typeof(cb) == "function") {
            cb();
        }
        return;
    }
        
    getURLasAB(jpgURL, function(arrayBuffer, date) {
        processedJpegs[jpgURL] = {'id': 'none'};
        var arc = jpegExtract(arrayBuffer);
        if(arc){
            var p = decodeMessage(arc);
            if(p){
                processedJpegs[jpgURL] = {id: do_decode(p, null, thumbURL, date, post_id).id};
            }
        }

        if (typeof(cb) == "function") {
            cb();
        }

    });
};