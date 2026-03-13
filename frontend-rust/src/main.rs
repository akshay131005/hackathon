use gloo_net::http::Request;
use serde::Deserialize;
use wasm_bindgen::prelude::*;
use yew::prelude::*;
use yew_router::prelude::*;

#[derive(Clone, Routable, PartialEq)]
enum Route {
    #[at("/")]
    Overview,
    #[at("/dashboard")]
    Dashboard,
    #[at("/issuer")]
    Issuer,
}

fn switch(route: Route) -> Html {
    match route {
        Route::Overview => html! { <OverviewPage /> },
        Route::Dashboard => html! { <HolderDashboardPage /> },
        Route::Issuer => html! { <IssuerPage /> },
    }
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
struct Credential {
    #[serde(rename = "credentialId")]
    credential_id: String,
    #[serde(rename = "credentialType")]
    credential_type: String,
    #[serde(rename = "issuerId")]
    issuer_id: String,
    #[serde(rename = "walletAddress")]
    wallet_address: Option<String>,
    #[serde(rename = "transactionHash")]
    transaction_hash: Option<String>,
    #[serde(rename = "revocationStatus")]
    revocation_status: Option<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq)]
struct VerificationLogEntry {
    #[serde(rename = "credentialId")]
    credential_id: String,
    #[serde(rename = "walletAddress")]
    wallet_address: String,
    #[serde(rename = "issuerId")]
    issuer_id: String,
    timestamp: String,
    result: String,
}

fn api_base() -> String {
    // align with backend default
    "http://localhost:4000".to_string()
}

#[function_component(OverviewPage)]
fn overview_page() -> Html {
    let creds = use_state(|| Option::<Vec<Credential>>::None);
    let logs = use_state(|| Option::<Vec<VerificationLogEntry>>::None);

    {
        let creds = creds.clone();
        let logs = logs.clone();
        use_effect_with((), move |_| {
            wasm_bindgen_futures::spawn_local(async move {
                let base = api_base();
                let creds_res = Request::get(&format!("{base}/credentials"))
                    .send()
                    .await;
                if let Ok(resp) = creds_res {
                    if let Ok(list) = resp.json::<Vec<Credential>>().await {
                        creds.set(Some(list));
                    }
                }
                let logs_res = Request::get(&format!("{base}/verificationLogs"))
                    .send()
                    .await;
                if let Ok(resp) = logs_res {
                    if let Ok(list) = resp.json::<Vec<VerificationLogEntry>>().await {
                        logs.set(Some(list));
                    }
                }
            });
            || ()
        });
    }

    let total_creds = creds
        .as_ref()
        .map(|v| v.len())
        .unwrap_or(0);
    let onchain = creds
        .as_ref()
        .map(|v| v.iter().filter(|c| c.transaction_hash.is_some()).count())
        .unwrap_or(0);
    let revoked = creds
        .as_ref()
        .map(|v| {
            v.iter()
                .filter(|c| {
                    c.revocation_status
                        .as_deref()
                        .unwrap_or("")
                        .to_ascii_uppercase()
                        == "REVOKED"
                })
                .count()
        })
        .unwrap_or(0);
    let verify_events = logs.as_ref().map(|v| v.len()).unwrap_or(0);

    html! {
        <div class="shell">
            <NavBar />
            <div class="card" style="padding: 1.25rem; margin-top: 1.25rem;">
                <h1 style="font-size: 1.35rem; margin-bottom: 0.5rem;">{"PrivacyPass Overview (Rust)"}</h1>
                <p style="font-size: 0.85rem; color:#9ca3af;">
                    {"Live stats pulled from the existing Node/Express backend and on-chain anchors, rendered via a Rust/Yew SPA."}
                </p>
            </div>
            <div style="display:grid; gap:1rem; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-top:1rem;">
                <StatCard title="Total credentials" value={total_creds.to_string()} subtitle="All credentials in the system" />
                <StatCard title="On-chain anchors" value={onchain.to_string()} subtitle="Credentials with transaction hashes" />
                <StatCard title="Revoked credentials" value={revoked.to_string()} subtitle="Revoked in the registry" />
                <StatCard title="Verification events" value={verify_events.to_string()} subtitle="Total verification log entries" />
            </div>
            <div style="display:grid; gap:1rem; grid-template-columns: minmax(0,2fr) minmax(0,1.5fr); margin-top:1.25rem;">
                <RecentCredentialsPanel creds={(*creds).clone()} />
                <VerificationLogPanel logs={(*logs).clone()} />
            </div>
        </div>
    }
}

#[derive(Properties, PartialEq)]
struct StatCardProps {
    title: String,
    value: String,
    subtitle: String,
}

#[function_component(StatCard)]
fn stat_card(props: &StatCardProps) -> Html {
    html! {
        <div class="card" style="padding:0.9rem 1rem; font-size:0.8rem;">
            <div style="text-transform:uppercase; letter-spacing:0.18em; font-size:0.65rem; color:#9ca3af;">
                { &props.title }
            </div>
            <div style="margin-top:0.25rem; font-size:1.4rem; font-weight:600;">
                { &props.value }
            </div>
            <div style="margin-top:0.25rem; color:#6b7280;">
                { &props.subtitle }
            </div>
        </div>
    }
}

#[derive(Properties, PartialEq)]
struct RecentCredentialsProps {
    creds: Option<Vec<Credential>>,
}

#[function_component(RecentCredentialsPanel)]
fn recent_creds_panel(props: &RecentCredentialsProps) -> Html {
    let list = props
        .creds
        .as_ref()
        .map(|v| {
            let mut copy = v.clone();
            copy.sort_by_key(|c| c.credential_id.clone());
            copy.truncate(6);
            copy
        })
        .unwrap_or_default();

    html! {
        <div class="card" style="padding:0.9rem 1rem; font-size:0.8rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                <span style="font-size:0.9rem; font-weight:600;">{"Recent credentials"}</span>
            </div>
            if list.is_empty() {
                <p style="font-size:0.75rem; color:#9ca3af;">{"No credentials found yet. Use the issuer portal to issue one."}</p>
            } else {
                <div style="display:flex; flex-direction:column; gap:0.4rem; max-height:11rem; overflow:auto;">
                { for list.iter().map(|c| {
                    let addr = c.wallet_address.as_deref().unwrap_or("—").to_string();
                    let short_addr = if addr.starts_with("0x") && addr.len() > 10 {
                        format!("{}…{}", &addr[..6], &addr[addr.len()-4..])
                    } else {
                        addr
                    };
                    let status = c.revocation_status.as_deref().unwrap_or("ACTIVE");
                    html!{
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.3rem 0.4rem; border-radius:0.75rem; background:#020617;">
                            <div>
                                <div>{ format!("{} – {}", c.credential_type, short_addr) }</div>
                                <div style="font-size:0.7rem; color:#6b7280;">{ format!("Issuer {}", c.issuer_id) }</div>
                            </div>
                            <span style="font-size:0.7rem; padding:0.1rem 0.45rem; border-radius:999px; border:1px solid #1e293b;">
                                { status }
                            </span>
                        </div>
                    }
                }) }
                </div>
            }
        </div>
    }
}

#[derive(Properties, PartialEq)]
struct VerificationLogPanelProps {
    logs: Option<Vec<VerificationLogEntry>>,
}

#[function_component(VerificationLogPanel)]
fn verification_log_panel(props: &VerificationLogPanelProps) -> Html {
    let list = props
        .logs
        .as_ref()
        .map(|v| {
            let mut copy = v.clone();
            copy.truncate(8);
            copy
        })
        .unwrap_or_default();

    html! {
        <div class="card" style="padding:0.9rem 1rem; font-size:0.8rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                <span style="font-size:0.9rem; font-weight:600;">{"Verification log"}</span>
            </div>
            if list.is_empty() {
                <p style="font-size:0.75rem; color:#9ca3af;">{"No verifications recorded yet."}</p>
            } else {
                <div style="display:flex; flex-direction:column; gap:0.35rem; max-height:11rem; overflow:auto;">
                    { for list.iter().map(|e| {
                        let addr = &e.wallet_address;
                        let short_addr = if addr.starts_with("0x") && addr.len() > 10 {
                            format!("{}…{}", &addr[..6], &addr[addr.len()-4..])
                        } else {
                            addr.clone()
                        };
                        let ok = e.result.to_ascii_uppercase() == "SUCCESS";
                        let chip_color = if ok { "#22c55e" } else { "#ef4444" };
                        let chip_label = if ok { "SUCCESS" } else { "FAILURE" };
                        html! {
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.3rem 0.4rem; border-radius:0.75rem; background:#020617;">
                                <div>
                                    <div>{ format!("{} → {}", e.issuer_id, short_addr) }</div>
                                    <div style="font-size:0.7rem; color:#6b7280;">{ &e.timestamp }</div>
                                </div>
                                <span style={format!("font-size:0.65rem; padding:0.1rem 0.45rem; border-radius:999px; border:1px solid {chip_color}; color:{chip_color};")}>
                                    { chip_label }
                                </span>
                            </div>
                        }
                    }) }
                </div>
            }
        </div>
    }
}

#[function_component(HolderDashboardPage)]
fn holder_dashboard_page() -> Html {
    html! {
        <div class="shell">
            <NavBar />
            <div class="card" style="padding:1rem; margin-top:1.25rem;">
                <h2 style="font-size:1.1rem; margin-bottom:0.4rem;">{"Holder dashboard (placeholder)"}</h2>
                <p style="font-size:0.8rem; color:#9ca3af;">
                    {"This Rust view can be extended to mirror the full React dashboard, calling /credentials and /verifyCredential for the connected wallet."}
                </p>
            </div>
        </div>
    }
}

#[function_component(IssuerPage)]
fn issuer_page() -> Html {
    html! {
        <div class="shell">
            <NavBar />
            <div class="card" style="padding:1rem; margin-top:1.25rem;">
                <h2 style="font-size:1.1rem; margin-bottom:0.4rem;">{"Issuer portal (placeholder)"}</h2>
                <p style="font-size:0.8rem; color:#9ca3af;">
                    {"You can port the existing issuer login, credential issuance, revocation, and security settings flows here using the same backend endpoints."}
                </p>
            </div>
        </div>
    }
}

#[function_component(NavBar)]
fn nav_bar() -> Html {
    html! {
        <nav style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem;">
            <div style="font-weight:600; letter-spacing:0.04em;">
                <span style="color:#22d3ee;">{"Privacy"}</span>
                <span style="color:#a855f7;">{"Pass"}</span>
                <span style="font-size:0.65rem; color:#9ca3af; margin-left:0.35rem;">{"Rust UI"}</span>
            </div>
            <div style="display:flex; gap:0.4rem; font-size:0.75rem;">
                <Link<Route> to={Route::Overview}>
                    { "Overview" }
                </Link<Route>>
                <Link<Route> to={Route::Dashboard}>
                    { "Holder" }
                </Link<Route>>
                <Link<Route> to={Route::Issuer}>
                    { "Issuer" }
                </Link<Route>>
            </div>
        </nav>
    }
}

#[wasm_bindgen(start)]
pub fn run() {
    yew::Renderer::<App>::new().render();
}

#[function_component(App)]
fn app() -> Html {
    html! {
        <BrowserRouter>
            <Switch<Route> render={switch} />
        </BrowserRouter>
    }
}

