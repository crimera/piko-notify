function response(message: string): Response {
	console.log(message)
	return new Response(message)
}

async function sendMessage(message: string, env: Env) {
	await fetch('https://api.telegram.org/bot' + env.TELEGRAM_TOKEN + '/sendMessage', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'chat_id=' + env.TELEGRAM_CHAT_ID + '&text=' + "🤖: " + message + '&message_thread_id=' + env.TELEGRAM_THREAD_ID + '&parse_mode=Markdown' + '&disable_web_page_preview=true'
	})
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const json: Github = await request.json();

		const receivedSignature = request.headers.get("X-Hub-Signature-256");
		if (!(await verifySignature(env.SECRET, receivedSignature ? receivedSignature : "", JSON.stringify(json)))) {
			return response("Validation failed")
		} else {
			console.log("Validation success")
		}

		if (url.pathname != "/github") {
			return response("BRUH")
		}

		const action = json.action;

		if (action == "published") {
			const repo = json.repository
			const release = json.release

			let assets = ""
			for (let i = 0; i < release.assets.length; i++) {
				let asset = release.assets[i]
				assets += `  ${i + 1}) [${asset.name}](${asset.browser_download_url})\n`
			}

			const releasetype = (release.prerelease) ? "prereleased" : "released"

			let message = `
			[${repo.name}](${repo.html_url}) *${releasetype}* [${release.tag_name}](${release.html_url})

			*Assets*:
			${assets}
			`.trim().replaceAll("			", "")

			await sendMessage(message, env)
		}

		if (action == "opened") {
			const repo = json.repository
			const pr = json.pull_request
			const commits = pr.commits

			let message = `
			[${pr.user.login}](${pr.user.html_url}) *wants to merge* ${commits} commit${(commits > 1) ? "s" : ""} into [${repo.name}](${repo.html_url}) at [#${pr.number}](${pr.html_url})

			*Title*: ${encodeURIComponent(pr.title)}
			*Files Changed*: ${pr.changed_files} with %2B${pr.additions} -${pr.deletions}
			`.trim().replaceAll("			", "")

			await sendMessage(message, env)
			return response("Opened: " + message)
		}


		if (action == "closed") {
			const pr = json.pull_request

			let message = `
			[${json.sender.login}](${json.sender.html_url}) *closed* [#${pr.number}](${pr.html_url})

			*Title*: ${encodeURIComponent(pr.title)}
			`.trim().replaceAll("			", "")

			await sendMessage(message, env)
			return response("Closed: " + message)
		}

		return response("idk")
	},
};

export interface Env {
	TELEGRAM_TOKEN: string
	TELEGRAM_CHAT_ID: string
	TELEGRAM_THREAD_ID: string
	SECRET: string
}

export interface Github {
	action: string
	pull_request: Pull_Request
	release: Release
	repository: Repository
	sender: User
}

export interface Release {
	html_url: string
	assets_url: string
	tag_name: string
	prerelease: boolean
	assets: Asset[]
}

export interface Asset {
	browser_download_url: string
	name: string
}

export interface Repository {
	name: string
	html_url: string
	full_name: string
}

export interface Pull_Request {
	url: string
	html_url: string
	title: string
	user: User
	commits: number
	number: number
	changed_files: number
	additions: number
	deletions: number
}

export interface User {
	login: string
	html_url: string
}

let encoder = new TextEncoder();

async function verifySignature(secret: string, header: string, payload: string) {
	let parts = header.split("=");
	let sigHex = parts[1];

	let algorithm = { name: "HMAC", hash: { name: 'SHA-256' } };

	let keyBytes = encoder.encode(secret);
	let extractable = false;
	let key = await crypto.subtle.importKey(
		"raw",
		keyBytes,
		algorithm,
		extractable,
		["sign", "verify"],
	);

	let sigBytes = hexToBytes(sigHex);
	let dataBytes = encoder.encode(payload);
	let equal = await crypto.subtle.verify(
		algorithm.name,
		key,
		sigBytes,
		dataBytes,
	);

	return equal;
}

function hexToBytes(hex: string) {
	let len = hex.length / 2;
	let bytes = new Uint8Array(len);

	let index = 0;
	for (let i = 0; i < hex.length; i += 2) {
		let c = hex.slice(i, i + 2);
		let b = parseInt(c, 16);
		bytes[index] = b;
		index += 1;
	}

	return bytes;
}
