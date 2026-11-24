import { useState, useEffect, createContext, useContext } from "react";

const API = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(
  /\/$/,
  "",
);
const Ctx = createContext();
const useApp = () => useContext(Ctx);
const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const esc = (v) => v ?? "";
const mask = (p) => p.slice(0, 2) + "XXXXXX" + p.slice(-2);
const DEMO_OTP = "123456";

// ---- Demo policy holders (used when the backend has no /api/auth endpoints) ----
const DEMO = {
  "HLT-2026-001234": {
    name: "Ramesh Kumar",
    phone: "9876543210",
    policy_id: "basic_health",
    type_en: "Basic Health Insurance",
    type_hi: "बेसिक स्वास्थ्य बीमा",
    sum_insured: 100000,
    valid_till: "2027-03-31",
    status: "Active",
    nominee: "Meena Kumar",
  },
  "ACC-2026-005678": {
    name: "Sunita Devi",
    phone: "9812345678",
    policy_id: "gig_accident",
    type_en: "Gig Worker Accident Cover",
    type_hi: "गिग वर्कर दुर्घटना बीमा",
    sum_insured: 200000,
    valid_till: "2027-01-15",
    status: "Active",
    nominee: "Raju Devi",
  },
};
const COVER = {
  basic_health: {
    docs: ["bill", "discharge_summary", "id_proof", "policy_copy"],
    ex_en: ["Cosmetic treatment", "Dental treatment", "Non-medical items"],
    ex_hi: ["सौंदर्य उपचार", "दाँतों का इलाज", "गैर-चिकित्सीय खर्च"],
    days: 30,
  },
  gig_accident: {
    docs: ["bill", "fir", "id_proof"],
    ex_en: ["Illness (accident only)", "Self-inflicted injury"],
    ex_hi: ["बीमारी (सिर्फ़ दुर्घटना कवर)", "खुद को पहुँचाई चोट"],
    days: 45,
  },
};
const DOC_NAME = {
  bill: ["Hospital bill", "अस्पताल का बिल"],
  discharge_summary: ["Discharge summary", "डिस्चार्ज समरी"],
  id_proof: ["ID proof", "पहचान पत्र"],
  policy_copy: ["Policy copy", "पॉलिसी की कॉपी"],
  fir: ["FIR / accident report", "FIR / दुर्घटना रिपोर्ट"],
};

// ---- API helpers: real backend first, demo fallback for auth ----
const post = (p, body) =>
  fetch(API + p, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
async function sendOtp(pn) {
  try {
    const r = await post("/api/auth/send-otp", { policy_number: pn });
    if (r.ok) return r.json();
  } catch {}
  const u = DEMO[pn];
  if (!u) throw new Error("nf");
  return { phone_masked: mask(u.phone), demo_otp: DEMO_OTP };
}
async function verifyOtp(pn, otp) {
  try {
    const r = await post("/api/auth/verify-otp", { policy_number: pn, otp });
    if (r.ok) return (await r.json()).user;
  } catch {}
  if (DEMO[pn] && otp === DEMO_OTP) return { policy_number: pn, ...DEMO[pn] };
  throw new Error("bad");
}

// ---- Login ----
function Login() {
  const { L, setUser } = useApp();
  const [pn, setPn] = useState(""),
    [otp, setOtp] = useState(""),
    [info, setInfo] = useState(null),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  const key = pn.trim().toUpperCase();
  const send = async () => {
    setErr("");
    setBusy(true);
    try {
      setInfo(await sendOtp(key));
    } catch {
      setErr(
        L(
          "Policy number not found. Check and try again.",
          "पॉलिसी नंबर नहीं मिला। दोबारा जाँचें।",
        ),
      );
    }
    setBusy(false);
  };
  const verify = async () => {
    setErr("");
    setBusy(true);
    try {
      setUser(await verifyOtp(key, otp.trim()));
    } catch {
      setErr(L("Wrong OTP. Try again.", "OTP गलत है। दोबारा डालें।"));
    }
    setBusy(false);
  };
  return (
    <div className="login card">
      <h2>{L("Policy holder login", "पॉलिसी धारक लॉगिन")}</h2>
      <p className="sub">
        {L(
          "Use your insurance policy number. We send an OTP to your registered phone.",
          "अपना बीमा पॉलिसी नंबर डालें। रजिस्टर्ड फोन पर OTP आएगा।",
        )}
      </p>
      {err && (
        <div className="err" role="alert">
          {err}
        </div>
      )}
      {!info ? (
        <>
          <label htmlFor="pn">{L("Policy number", "पॉलिसी नंबर")}</label>
          <input
            id="pn"
            value={pn}
            onChange={(e) => setPn(e.target.value)}
            placeholder="HLT-2026-001234"
            autoCapitalize="characters"
          />
          <button className="btn" disabled={busy || !key} onClick={send}>
            {L("Send OTP", "OTP भेजें")}
          </button>
          <p className="note">
            {L(
              "Demo policies: HLT-2026-001234, ACC-2026-005678",
              "डेमो पॉलिसी: HLT-2026-001234, ACC-2026-005678",
            )}
          </p>
        </>
      ) : (
        <>
          <p>
            {L("OTP sent to", "OTP भेजा गया")} <b>{info.phone_masked}</b>
          </p>
          {info.demo_otp && (
            <div className="demo">
              {L("Demo mode: your OTP is", "डेमो मोड: आपका OTP है")}{" "}
              <b>{info.demo_otp}</b>
            </div>
          )}
          <label htmlFor="otp">OTP</label>
          <input
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <button
            className="btn"
            disabled={busy || otp.length < 6}
            onClick={verify}
          >
            {L("Login", "लॉगिन करें")}
          </button>
          <button
            className="btn alt"
            onClick={() => {
              setInfo(null);
              setOtp("");
            }}
          >
            {L("Change policy number", "पॉलिसी नंबर बदलें")}
          </button>
        </>
      )}
    </div>
  );
}

// ---- Pages ----
function PolicyCard() {
  const { L, lang, user } = useApp();
  return (
    <div className="pol">
      <small>{L("Policy holder", "पॉलिसी धारक")}</small>
      <h2>{user.name}</h2>
      <small>{L("Policy type", "पॉलिसी का प्रकार")}</small>
      <b>{user["type_" + lang] || user.type_en}</b>
      <small style={{ marginTop: 8 }}>
        {L("Policy number", "पॉलिसी नंबर")}
      </small>
      <b>{user.policy_number}</b>
    </div>
  );
}
function Home() {
  const { L, user, setPage } = useApp();
  const T = [
    ["claim", "📄", L("File a claim", "क्लेम करें")],
    ["policy", "🛡️", L("My policy", "मेरी पॉलिसी")],
    ["complaint", "📝", L("Complaint", "शिकायत")],
    ["phone", "📱", L("Change number", "नंबर बदलें")],
    ["help", "❓", L("Help", "मदद")],
  ];
  return (
    <>
      <h2>
        {L("Namaste", "नमस्ते")}, {user.name.split(" ")[0]}
      </h2>
      <p className="sub">
        {L("What would you like to do?", "आप क्या करना चाहते हैं?")}
      </p>
      <PolicyCard />
      <div className="tiles">
        {T.map(([k, i, n]) => (
          <button key={k} className="tile" onClick={() => setPage(k)}>
            <span>{i}</span>
            {n}
          </button>
        ))}
      </div>
    </>
  );
}
function Policy() {
  const { L, lang, user } = useApp(),
    c = COVER[user.policy_id] || COVER.basic_health;
  const row = (a, b) => (
    <li>
      <span>{a}</span>
      <b>{b}</b>
    </li>
  );
  return (
    <>
      <h2>{L("My policy", "मेरी पॉलिसी")}</h2>
      <PolicyCard />
      <div className="card">
        <ul>
          {row(L("Sum insured", "बीमा राशि"), inr(user.sum_insured))}
          {row(L("Valid till", "वैध तिथि तक"), user.valid_till)}
          {row(L("Status", "स्थिति"), user.status)}
          {row(L("Nominee", "नॉमिनी"), user.nominee || "-")}
          {row(L("Phone", "फोन"), mask(user.phone))}
          {row(
            L("Claim within", "क्लेम की समय सीमा"),
            L(
              c.days + " days of discharge",
              "छुट्टी के " + c.days + " दिन के अंदर",
            ),
          )}
        </ul>
      </div>
      <div className="card">
        <b>{L("Papers needed for a claim", "क्लेम के लिए ज़रूरी कागज़")}</b>
        <ul>
          {c.docs.map((d) => (
            <li key={d}>{DOC_NAME[d][lang === "hi" ? 1 : 0]}</li>
          ))}
        </ul>
      </div>
      <div className="card">
        <b>{L("Not covered", "इनका पैसा नहीं मिलेगा")}</b>
        <ul>
          {(lang === "hi" ? c.ex_hi : c.ex_en).map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
function Complaint() {
  const { L, user, complaints, setComplaints } = useApp();
  const cats = [
    ["Claim delayed", "क्लेम में देरी"],
    ["Claim rejected", "क्लेम रिजेक्ट हुआ"],
    ["Wrong amount paid", "गलत रकम मिली"],
    ["Agent behaviour", "एजेंट का व्यवहार"],
    ["Other", "अन्य"],
  ];
  const [cat, setCat] = useState(0),
    [msg, setMsg] = useState(""),
    [done, setDone] = useState(null);
  const submit = async () => {
    let id = "CMP-" + Math.floor(10000 + Math.random() * 90000);
    try {
      const r = await post("/api/complaints", {
        policy_number: user.policy_number,
        category: cats[cat][0],
        message: msg,
      });
      if (r.ok) id = (await r.json()).complaint_id || id;
    } catch {}
    setComplaints([
      { id, cat: cats[cat], msg, at: new Date().toLocaleDateString("en-IN") },
      ...complaints,
    ]);
    setDone(id);
    setMsg("");
  };
  return (
    <>
      <h2>{L("Raise a complaint", "शिकायत दर्ज करें")}</h2>
      <p className="sub">
        {L(
          "Tell us what went wrong. We will track it for you.",
          "क्या गड़बड़ हुई, बताएँ। हम इसे ट्रैक करेंगे।",
        )}
      </p>
      <div className="card">
        <label htmlFor="cat">{L("Type of problem", "समस्या का प्रकार")}</label>
        <select id="cat" value={cat} onChange={(e) => setCat(+e.target.value)}>
          {cats.map((c, i) => (
            <option key={i} value={i}>
              {L(c[0], c[1])}
            </option>
          ))}
        </select>
        <label htmlFor="msg">{L("Details", "विवरण")}</label>
        <textarea
          id="msg"
          rows={4}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <button
          className="btn"
          disabled={msg.trim().length < 5}
          onClick={submit}
        >
          {L("Submit complaint", "शिकायत भेजें")}
        </button>
        {done && (
          <div className="demo">
            {L("Complaint registered. ID:", "शिकायत दर्ज हो गई। ID:")}{" "}
            <b>{done}</b>
          </div>
        )}
      </div>
      {complaints.length > 0 && (
        <div className="card">
          <b>{L("Your complaints", "आपकी शिकायतें")}</b>
          <ul>
            {complaints.map((c) => (
              <li key={c.id}>
                <span>
                  {c.id} · {L(c.cat[0], c.cat[1])}
                </span>
                <span className="note">
                  {c.at} · {L("Open", "खुली")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
function Phone() {
  const { L, user, setUser } = useApp();
  const [num, setNum] = useState(""),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false),
    [ok, setOk] = useState(false),
    [err, setErr] = useState("");
  const valid = /^[6-9]\d{9}$/.test(num);
  const verify = async () => {
    try {
      await post("/api/auth/change-phone", {
        policy_number: user.policy_number,
        new_phone: num,
        otp,
      });
    } catch {}
    if (otp !== DEMO_OTP) return setErr(L("Wrong OTP.", "OTP गलत है।"));
    setUser({ ...user, phone: num });
    setOk(true);
    setSent(false);
    setErr("");
  };
  return (
    <>
      <h2>{L("Change phone number", "फोन नंबर बदलें")}</h2>
      <p className="sub">
        {L("Current number", "मौजूदा नंबर")}: {mask(user.phone)}
      </p>
      <div className="card">
        {err && <div className="err">{err}</div>}
        {ok && (
          <div className="demo">✔ {L("Number updated.", "नंबर बदल गया।")}</div>
        )}
        <label htmlFor="num">
          {L("New 10-digit mobile number", "नया 10 अंकों का मोबाइल नंबर")}
        </label>
        <input
          id="num"
          value={num}
          onChange={(e) => {
            setNum(e.target.value.replace(/\D/g, ""));
            setOk(false);
          }}
          inputMode="numeric"
          maxLength={10}
          disabled={sent}
        />
        {!sent ? (
          <button
            className="btn"
            disabled={!valid}
            onClick={() => setSent(true)}
          >
            {L("Send OTP to new number", "नए नंबर पर OTP भेजें")}
          </button>
        ) : (
          <>
            <div className="demo">
              {L("Demo mode: OTP is", "डेमो मोड: OTP है")} <b>{DEMO_OTP}</b>
            </div>
            <label htmlFor="o2">OTP</label>
            <input
              id="o2"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={6}
            />
            <button className="btn" disabled={otp.length < 6} onClick={verify}>
              {L("Confirm", "पक्का करें")}
            </button>
          </>
        )}
      </div>
    </>
  );
}
function Help() {
  const { L } = useApp();
  const Q = [
    [
      "How long does a claim take?",
      "क्लेम में कितना समय लगता है?",
      "Usually 7 to 15 days if all papers are complete.",
      "सभी कागज़ पूरे हों तो आमतौर पर 7 से 15 दिन।",
    ],
    [
      "Why was my claim rejected?",
      "मेरा क्लेम रिजेक्ट क्यों हुआ?",
      "Most rejections are due to missing papers, name mismatch, or excluded items. Use File a claim to check before you submit.",
      'ज़्यादातर रिजेक्शन कागज़ की कमी, नाम में फर्क या बाहर रखे खर्च से होते हैं। जमा करने से पहले "क्लेम करें" में जाँच लें।',
    ],
    [
      "Is there a deadline to claim?",
      "क्लेम की आखिरी तारीख है?",
      "Yes. See My policy for the number of days after discharge.",
      'हाँ। "मेरी पॉलिसी" में देखें कि छुट्टी के कितने दिन के अंदर।',
    ],
  ];
  return (
    <>
      <h2>{L("Help", "मदद")}</h2>
      <div className="card">
        {Q.map((q, i) => (
          <details key={i}>
            <summary>{L(q[0], q[1])}</summary>
            <p>{L(q[2], q[3])}</p>
          </details>
        ))}
      </div>
      <div className="card">
        <b>{L("Helpline (demo)", "हेल्पलाइन (डेमो)")}</b>
        <p>
          1800-000-0000 · {L("Mon-Sat, 9am-6pm", "सोम-शनि, सुबह 9 से शाम 6")}
        </p>
      </div>
    </>
  );
}

// ---- Claim flow ----
function Claim() {
  const { L, lang, user } = useApp(),
    c = COVER[user.policy_id] || COVER.basic_health;
  const [step, setStep] = useState(0),
    [samples, setSamples] = useState([]),
    [sid, setSid] = useState(null),
    [file, setFile] = useState(null);
  const [docs, setDocs] = useState({ bill: true, id_proof: true }),
    [bill, setBill] = useState(null),
    [res, setRes] = useState(null),
    [sub, setSub] = useState(null);
  const [busy, setBusy] = useState(""),
    [err, setErr] = useState("");
  const bad = L(
    "Something went wrong. Is the backend running at " + API + "?",
    "कुछ गड़बड़ हुई। क्या बैकएंड " + API + " पर चालू है?",
  );
  useEffect(() => {
    fetch(API + "/api/samples")
      .then((r) => r.json())
      .then((d) => setSamples(d.samples || d))
      .catch(() => setErr(bad));
  }, []);
  const payload = () => ({
    policy_id: user.policy_id,
    bill,
    policy_holder_name: user.name,
    documents_provided: Object.keys(docs).filter((k) => docs[k]),
  });
  const run = async (msg, fn) => {
    setErr("");
    setBusy(msg);
    try {
      await fn();
    } catch {
      setErr(bad);
    }
    setBusy("");
  };
  const extract = () =>
    !file && !sid
      ? setErr(
          L(
            "Upload a bill photo or pick a sample.",
            "बिल की फोटो डालें या नमूना चुनें।",
          ),
        )
      : run(L("Reading your bill...", "आपका बिल पढ़ रहे हैं..."), async () => {
          let r;
          if (file) {
            const fd = new FormData();
            fd.append("file", file);
            r = await fetch(API + "/api/extract", { method: "POST", body: fd });
          } else r = await post("/api/extract", { sample_id: sid });
          if (!r.ok) throw 0;
          setBill(await r.json());
          setStep(1);
        });
  const validate = () =>
    run(L("Checking your claim...", "क्लेम जाँच रहे हैं..."), async () => {
      const r = await post("/api/validate", payload());
      if (!r.ok) throw 0;
      setRes(await r.json());
      setStep(2);
      speechSynthesis.cancel();
    });
  const pdf = () =>
    run("", async () => {
      const r = await post("/api/claim-pdf", { ...payload(), validation: res });
      if (!r.ok) throw 0;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(await r.blob());
      a.download = "claimsaathi-claim.pdf";
      a.click();
    });
  const submit = () =>
    run("", async () => {
      const r = await post("/api/submit", { ...payload(), validation: res });
      if (!r.ok) throw 0;
      setSub(await r.json());
    });
  const listen = () => {
    if (speechSynthesis.speaking) return speechSynthesis.cancel();
    const adv = (lang === "hi" ? res.advice_hi : res.advice_en) || [];
    const u = new SpeechSynthesisUtterance(
      L("Claim readiness ", "क्लेम तैयारी ") +
        res.readiness_score +
        ". " +
        adv.join(". "),
    );
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  };
  const F = (k, label, type = "text") => (
    <>
      <label>{label}</label>
      <input
        type={type}
        value={esc(bill[k])}
        onChange={(e) =>
          setBill({
            ...bill,
            [k]: type === "number" ? +e.target.value : e.target.value,
          })
        }
      />
    </>
  );
  const bar = [
    L("Bill", "बिल"),
    L("Review", "जाँच"),
    L("Result", "नतीजा"),
    L("Claim", "क्लेम"),
  ];
  if (busy)
    return (
      <div className="load" aria-live="polite">
        <div className="spin" />
        <b>{busy}</b>
      </div>
    );
  const sc = res?.readiness_score,
    col = sc >= 80 ? "var(--ok)" : sc >= 50 ? "var(--warn)" : "var(--bad)";
  return (
    <>
      <div className="row" style={{ marginBottom: 14, gap: 6 }}>
        {bar.map((n, i) => (
          <div
            key={n}
            className="note"
            style={{
              borderTop:
                "4px solid " + (i <= step ? "var(--pri)" : "var(--line)"),
              paddingTop: 4,
              textAlign: "center",
              fontWeight: i === step ? 700 : 400,
            }}
          >
            {n}
          </div>
        ))}
      </div>
      {err && (
        <div className="err" role="alert">
          {err}
        </div>
      )}
      {step === 0 && (
        <>
          <h2>{L("Upload your hospital bill", "अस्पताल का बिल अपलोड करें")}</h2>
          <label className="pick" htmlFor="file">
            📷 {L("Take or choose a bill photo", "बिल की फोटो लें या चुनें")}
            <small>{file ? file.name : L("Tap here", "यहाँ दबाएँ")}</small>
          </label>
          <input
            id="file"
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              setFile(e.target.files[0] || null);
              setSid(null);
            }}
          />
          <div className="card" style={{ marginTop: 14 }}>
            <b>{L("Or try a sample bill", "या नमूना बिल आज़माएँ")}</b>
            {samples.map((s) => (
              <button
                key={s.id}
                className={"chip" + (sid === s.id ? " on" : "")}
                onClick={() => {
                  setSid(sid === s.id ? null : s.id);
                  setFile(null);
                }}
              >
                {lang === "hi" ? s.title_hi : s.title_en}
              </button>
            ))}
          </div>
          <div className="card">
            <b>
              {L("Which papers do you have?", "आपके पास कौन-से कागज़ हैं?")}
            </b>
            {[
              ...new Set([
                ...c.docs,
                "discharge_summary",
                "policy_copy",
                "fir",
              ]),
            ].map((d) => (
              <label key={d} className="chk">
                <input
                  type="checkbox"
                  checked={!!docs[d]}
                  onChange={(e) => setDocs({ ...docs, [d]: e.target.checked })}
                />
                {DOC_NAME[d][lang === "hi" ? 1 : 0]}
              </label>
            ))}
          </div>
          <button className="btn" onClick={extract}>
            {L("Read my bill", "मेरा बिल पढ़ें")}
          </button>
        </>
      )}
      {step === 1 && bill && (
        <>
          <h2>{L("Check the details", "जानकारी जाँचें")}</h2>
          <div className="card">
            {F("patient_name", L("Patient name", "मरीज़ का नाम"))}
            {F("hospital", L("Hospital", "अस्पताल"))}
            <div className="row">
              <div>{F("admission_date", L("Admission", "भर्ती"), "date")}</div>
              <div>{F("discharge_date", L("Discharge", "छुट्टी"), "date")}</div>
            </div>
            {F("diagnosis", L("Diagnosis", "बीमारी"))}
            {F("total_amount", L("Total (₹)", "कुल रकम (₹)"), "number")}
            <p className="note">
              {L("Reading confidence", "पढ़ने का भरोसा")}:{" "}
              {Math.round((bill.confidence || 0) * 100)}%
            </p>
          </div>
          {bill.items?.length > 0 && (
            <div className="card">
              <ul>
                {bill.items.map((i, k) => (
                  <li key={k}>
                    <span>{i.name}</span>
                    <b>{inr(i.amount)}</b>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="row">
            <button className="btn alt" onClick={() => setStep(0)}>
              {L("Back", "वापस")}
            </button>
            <button className="btn" onClick={validate}>
              {L("Check my claim", "मेरा क्लेम जाँचें")}
            </button>
          </div>
        </>
      )}
      {step === 2 && res && (
        <>
          <h2>{L("Your claim check", "आपके क्लेम की जाँच")}</h2>
          <div className="stamp" style={{ color: col, borderColor: col }}>
            <b>{sc}</b>
            <span>
              {sc >= 80
                ? L("Ready", "तैयार")
                : sc >= 50
                  ? L("Almost", "लगभग तैयार")
                  : L("Not ready", "तैयार नहीं")}
            </span>
          </div>
          <div className="big">
            <div className="g">
              {L("Insurance pays", "बीमा से मिलेगा")}
              <b>{inr(res.covered_amount)}</b>
            </div>
            <div className="r">
              {L("Not covered", "नहीं मिलेगा")}
              <b>{inr(res.non_covered_amount)}</b>
            </div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <b>{L("Papers checklist", "कागज़ों की सूची")}</b>
            <ul>
              {(res.documents || []).map((d, i) => (
                <li key={i}>
                  <span>{d.name}</span>
                  <span className={d.status}>
                    {d.status === "provided"
                      ? "✔ " + L("Have", "है")
                      : "✖ " + L("Missing", "कमी")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {(res.warnings || []).map((w, i) => (
            <div key={i} className="warn">
              ⚠ {lang === "hi" ? w.message_hi : w.message_en}
            </div>
          ))}
          <div className="card" style={{ marginTop: 14 }}>
            <b>{L("What to do next", "अब क्या करना है")}</b>
            <ul>
              {((lang === "hi" ? res.advice_hi : res.advice_en) || []).map(
                (a, i) => (
                  <li key={i}>{a}</li>
                ),
              )}
            </ul>
            <button className="btn alt" onClick={listen}>
              🔊 {L("Listen", "सुनें")}
            </button>
          </div>
          <div className="row">
            <button className="btn alt" onClick={() => setStep(1)}>
              {L("Back", "वापस")}
            </button>
            <button className="btn" onClick={() => setStep(3)}>
              {L("Make claim package", "क्लेम पैकेज बनाएँ")}
            </button>
          </div>
        </>
      )}
      {step === 3 && res && (
        <>
          <h2>{L("Your claim package", "आपका क्लेम पैकेज")}</h2>
          <div className="card">
            <b>{bill.patient_name}</b>
            <br />
            {bill.hospital}
            <br />
            {L("Insurance pays", "बीमा से मिलेगा")}:{" "}
            <b>{inr(res.covered_amount)}</b>
          </div>
          <button className="btn" onClick={pdf}>
            ⬇ {L("Download claim package", "क्लेम पैकेज डाउनलोड करें")}
          </button>
          {sub ? (
            <div className="card" style={{ marginTop: 14 }}>
              <div className="note">{L("Tracking ID", "ट्रैकिंग ID")}</div>
              <h2>{sub.tracking_id}</h2>
              {L("Expected time", "अनुमानित समय")}: {sub.expected_days}{" "}
              {L("days", "दिन")}
              <p className="note">
                {L(
                  "Demo only. Nothing was sent to a real insurer.",
                  "सिर्फ़ डेमो। असली बीमा कंपनी को कुछ नहीं भेजा गया।",
                )}
              </p>
            </div>
          ) : (
            <button className="btn alt" onClick={submit}>
              {L("Send to insurer (demo)", "बीमा कंपनी को भेजें (डेमो)")}
            </button>
          )}
        </>
      )}
    </>
  );
}

// ---- Shell ----
export default function App() {
  const [lang, setLang] = useState("hi"),
    [page, setPage] = useState("home"),
    [complaints, setComplaints] = useState([]);
  const [user, setU] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("cs_user"));
    } catch {
      return null;
    }
  });
  const L = (e, h) => (lang === "hi" ? h : e);
  const setUser = (u) => {
    setU(u);
    try {
      sessionStorage.setItem("cs_user", JSON.stringify(u));
    } catch {}
  };
  const logout = () => {
    setU(null);
    setPage("home");
    try {
      sessionStorage.removeItem("cs_user");
    } catch {}
    speechSynthesis.cancel();
  };
  const nav = [
    ["home", L("Home", "होम")],
    ["claim", L("File claim", "क्लेम करें")],
    ["policy", L("My policy", "मेरी पॉलिसी")],
    ["complaint", L("Complaint", "शिकायत")],
    ["phone", L("Change number", "नंबर बदलें")],
    ["help", L("Help", "मदद")],
  ];
  const Page = {
    home: Home,
    claim: Claim,
    policy: Policy,
    complaint: Complaint,
    phone: Phone,
    help: Help,
  }[page];
  return (
    <Ctx.Provider
      value={{
        L,
        lang,
        user,
        setUser,
        page,
        setPage,
        complaints,
        setComplaints,
      }}
    >
      <header>
        <div className="top">
          <b>ClaimSaathi</b>
          <div className="right">
            <div className="lang">
              <button
                className={lang === "hi" ? "on" : ""}
                onClick={() => setLang("hi")}
              >
                हिन्दी
              </button>
              <button
                className={lang === "en" ? "on" : ""}
                onClick={() => setLang("en")}
              >
                English
              </button>
            </div>
            {user && (
              <button className="out" onClick={logout}>
                {L("Logout", "लॉगआउट")}
              </button>
            )}
          </div>
        </div>
        {user && (
          <nav>
            {nav.map(([k, n]) => (
              <button
                key={k}
                className={page === k ? "on" : ""}
                onClick={() => setPage(k)}
              >
                {n}
              </button>
            ))}
          </nav>
        )}
      </header>
      <main>{user ? <Page key={page} /> : <Login />}</main>
    </Ctx.Provider>
  );
}
