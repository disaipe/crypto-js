window.CryptoHelper = function() {	
	const self = this;
	const crypto = cadesplugin;

	const SIGN_DETACHED = true;
	const VERBOSE = true;

	self.isReady = false;

	/**
	 * Handle plugin init event
	 * @returns {Promise}
	 */
	this.init = () => {
		return new Promise((resolve, reject) => { 
			crypto.then(async () => {
				if (await check()) {
					resolve();
				} else {
					reject(new Error('Cadesplugin not activated'));
				}
			}).catch((e) => {
				reject(e);	
			});
		});
	};

	/**
	 * Get valid certificates from store
	 * @param {Number} location location of the store to be opened
	 * @param {String} storeName a string that contains the name of the system certificate store to be opened
	 * @param {Number} mode open mode of the store
	 * @returns {Array<Certificate>}
	 */
	this.getCertificates = (location, storeName, mode) => {
		const _location = location || crypto.CAPICOM_CURRENT_USER_STORE;
		const _storeName = storeName || crypto.CAPICOM_MY_STORE;
		const _mode = mode || crypto.CAPICOM_STORE_OPEN_MAXIMUM_ALLOWED;
		
		return new Promise(async (resolve) => {
			const store = await createStore();
			store.Open(_location, _storeName, _mode);

			let certs = await store.Certificates;
			certs = await certs.Find(crypto.CAPICOM_CERTIFICATE_FIND_TIME_VALID);

			const certificates = [];
			for (let i = 1; i <= await certs.Count; i += 1) {
				const cert = await certs.Item(i);
				certificates.push(await parseCertificate(cert));
			}

			store.Close();

			resolve(certificates);
		});
	};

	/**
	 * Sign various data type by chosen certificate
	 * @param {Certificate} certificate
	 * @param {String|File|DomElement} data
	 * @returns {String}
	 */
	this.sign = (certificate, data) => {
		if (data instanceof File) {
			log('[Crypto] Signing File');
			return this.signFile(certificate, data);
		} else if (data instanceof FileList) {
			log('[Crypto] Signing FileList');
			return this.signFileList(certificate, data);
		} else if (data instanceof HTMLInputElement && data.type === 'file') {
			log('[Crypto] Signing file input');
			return this.signFileList(certificate, data.files);
		} else {
			log('[Crypto] Signing string');
			return this.signString(certificate, data);
		}
	};

	/**
	 * Sign string data by chosen certificate
	 * @param {Certificate} certificate
	 * @param {String} data
	 * @param {Boolean} toBase64
	 * @returns {String}
	 */
	this.signString = (certificate, data, toBase64 = true) => {
		return new Promise(async (resolve, reject) => {
			const signer = await createSigner();
			const signedData = await createSignedData();

			await signer.propset_Certificate(certificate.$original || certificate);
			await signer.propset_Options(crypto.CAPICOM_CERTIFICATE_INCLUDE_WHOLE_CHAIN)

			await signedData.propset_ContentEncoding(crypto.CADESCOM_BASE64_TO_BINARY);
			await signedData.propset_Content(toBase64 ? btoa(data) : data);

			try {
				const signedMessage = await signedData.SignCades(signer, crypto.CADESCOM_CADES_BES, SIGN_DETACHED);
				resolve(signedMessage);
			} catch (e) {
				console.error('[Crypto] Sign failed', e);
				reject(false);
			}
		});
	};

	/**
	 * Sign file by chosen certificate
	 * @param {Certificate} certificate
	 * @param {File} file
	 * @returns {String}
	 */
	this.signFile = (certificate, file) => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => {
				const header = ';base64,';
				const fileData = reader.result;
				const fileContent = fileData.substr(fileData.indexOf(header) + header.length);
				resolve(this.signString(certificate, fileContent, false));
			};
		});
	};

	/**
	 * Sign file list by chosen certificate
	 * @param {Certificate} certificate
	 * @param {FileList} fileList
	 * @returns {Array<String>}
	 */
	this.signFileList = (certificate, fileList) => {
		const promises = Array.from(fileList).map((file) => {
			return this.signFile(certificate, file);
		});

		return Promise.all(promises);
	};

	/**
	 * Verify data sign
	 * @param {String} data
	 * @param {String} sign
	 * @param {Boolean} toBase64
	 * @returns {Array<Object>}
	 */
	this.verify = (data, sign, toBase64 = false) => {
		return new Promise(async (resolve) => {
			const signedData = await createSignedData();

			signedData.propset_ContentEncoding(crypto.CADESCOM_BASE64_TO_BINARY);
			signedData.propset_Content(toBase64 ? btoa(data) : data);

			try {
				await signedData.VerifyCades(sign, crypto.CADESCOM_CADES_BES, true);
				const signs = await signInfo(signedData);
				resolve(signs);
			} catch (e) {
				console.error('[Crypto] Verify failed', e);
				resolve(false);
			}
		});
	};

	/**
	 * Get installed CSP version
	 */
	this.checkCSP = () => {
		return new Promise(async (resolve, reject) => {
			try {
				let oAbout = await crypto.CreateObjectAsync('CAdESCOM.About');
				let oVersion = await oAbout.CSPVersion();

				const about = {
					version: await oVersion.toString(),
					name: await oAbout.CSPName()
				};

				resolve(about);
			} catch (e) {
				reject();
			}
		});
	};

	/**
	 * Check cadesplugin is ready
	 * (try create Store object)
	 */
	async function check() {
		try {
			await createStore();
			return self.isReady = true;
		} catch (e) {
			return self.isReady = false;
		}
	}

	/**
	 * Create new CAdESCOM.Store instance
	 * View more at https://cpdn.cryptopro.ru/content/cades/class_store.html
	 * @returns {CAdESCOM.Store}
	 */
	async function createStore() {
		return await crypto.CreateObjectAsync('CAdESCOM.Store');
	}

	/**
	 * Create new CAdESCOM.CPSigner instance
	 * View more at https://cpdn.cryptopro.ru/content/cades/class_c_ad_e_s_c_o_m_1_1_c_p_signer.html
	 * @returns {CAdESCOM.CPSigner}
	 */
	async function createSigner() {
		return await crypto.CreateObjectAsync('CAdESCOM.CPSigner');
	}

	/**
	 * Create new CAdESCOM.CadesSignedData instance
	 * View more at https://cpdn.cryptopro.ru/content/cades/class_c_ad_e_s_c_o_m_1_1_cades_signed_data.html
	 * @returns {CAdESCOM.CadesSignedData}
	 */
	async function createSignedData() {
		return await crypto.CreateObjectAsync('CAdESCOM.CadesSignedData');
	}

	/**
	 * Extract certificate subject info
	 * @param {Certificate} certificate 
	 * @returns {Object}
	 */
	async function extractSubjectName(certificate) {
		var subject = await certificate.SubjectName;
		return parseDN(subject);
	}

	/**
	 * Extract certificate issuer info
	 * @param {Certificate} certificate 
	 * @return {Object}
	 */
	async function extractIssuerName(certificate) {
		var issuer = await certificate.IssuerName;			
		return parseDN(issuer);
	}

	/**
	 * Extract certificate info
	 * @param {Certificate} certificate
	 * @returns {Object}
	 */
	async function parseCertificate(certificate) {
		const isValid = await certificate.IsValid();

		return {
			$original: certificate,
			subject: await extractSubjectName(certificate),
			issuer: await extractIssuerName(certificate),
			version: await certificate.Version,
			serialNumber: await certificate.SerialNumber,
			thumbprint: await certificate.Thumbprint,
			validFrom: await certificate.ValidFromDate,
			validTo: await certificate.ValidToDate,
			hasPrivate: await certificate.HasPrivateKey(),
			isValid: await isValid.Result
		}
	}

	/**
	 * Extract signers from SignedData object
	 * @param {CAdESCOM.CadesSignedData} signedData
	 * @returns {Array<Object>}
	 */
	async function signInfo(signedData) {
		const signers = await signedData.Signers;
		const count = await signers.Count;

		const signs = [];

		for (let i = 1; i <= count; i += 1) {
			const signer = await signers.Item(i);
			const certificate = await signer.Certificate;

			const sign = {
				ts: await signer.SigningTime,
				cert: await parseCertificate(certificate)
			};

			signs.push(sign);
		}

		return signs;
	}

	/**
	 * Parse DN string to object
	 * @param {String} dn
	 * @returns {Object}
	 */
	function parseDN(dn) {
		const tags = {
			'CN': 'name',
			'S': 'region',
			'STREET': 'address',
			'O': 'company',
			'OU': 'postType',
			'T': 'post',
			'ОГРН': 'ogrn',
			'СНИЛС': 'snils',
			'ИНН': 'inn',
			'E': 'email',
			'L': 'city'
		};

		let buf = dn;
		const fields = [...buf.matchAll(/(\w+)=/g)].reduceRight((acc, cur) => {
			let v = buf.substring(cur.index);
			v = v.replace(cur[0], '');
			v = v.replace(/\s*"?(.*?)"?,?\s?$/, '$1');
			v = v.replace(/""/g, '"');

			const tag = cur[1];

			if (tags[tag]) {
				acc[tags[tag]] = v;
			}

			buf = buf.substring(0, cur.index);

			return acc;
		}, {});

		return fields;
	}

	/**
	 * Write verbose message to console
	 * @param  {...any} args 
	 */
	function log(...args) {
		if (VERBOSE) {
			console.log(...args);
		}
	}
}

/**
 * String.matchAll polyfill
 */
if (!String.prototype.matchAll) {
	String.prototype.matchAll = function*(regex) {
		function ensureFlag(flags, flag) {
			return flags.includes(flag) ? flags : (flags + flag);
		}

		const localRegex = new RegExp(regex, ensureFlag(regex.flags, 'g'));

		let match;
		while (match = localRegex.exec(this)) {
			yield match;
		}
	}
}
