import type { SpaceModelId, SpaceTarget } from '../libs/space-monitor/types';

export const SPACE_MODELS = ['pixal3d', 'trellis', 'hunyuan3d'] as const;

export interface SpaceIdentityProfile {
  model: SpaceModelId;
  target: SpaceTarget & { revision: string };
  modelIds: readonly string[];
  appFile: string;
  /** SHA-256 of UTF-8 source with CRLF normalized to LF, at the reviewed revision. */
  sourceHashes: Readonly<Record<string, string>>;
  /** Complete recursive tree path/type/OID digest, excluding only root README metadata. */
  codeTreeDigest: string;
  frontend: 'custom' | 'gradio';
  requiredControls: readonly string[];
  requiredTab?: string;
  customWorkflow?: {
    imageInputId: string;
    generateControlId: string;
    downloadControlId: string;
    generateApi: string;
    exportApi: string;
    exportSchema: 'string' | 'file';
  };
}

// Public source and frontend reviewed 2026-10-07. A successful probe does not test inference.
// Matching app/backend AND requirements is required after source drift or for a new clone.
export const SPACE_IDENTITY_PROFILES: readonly SpaceIdentityProfile[] = [
  {
    model: 'pixal3d',
    target: { spaceId: 'victor/pixal3d-studio', url: 'https://victor-pixal3d-studio.hf.space', revision: 'ef1cb838893269417b3eaa81dd8fc635f65a5180' },
    modelIds: ['TencentARC/Pixal3D', 'TencentARC/Pixal3D-T'], appFile: 'app.py', frontend: 'custom', requiredControls: [],
    customWorkflow: { imageInputId: 'imageInput', generateControlId: 'generateBtn', downloadControlId: 'downloadBtn', generateApi: 'generate_fast', exportApi: 'extract', exportSchema: 'string' },
    codeTreeDigest: 'bc79322816e8ea7406d333d36bf4e9c65bd535a9eb6471568954b520228d3ccb',
    sourceHashes: {
      'app.py': '709507a198a6c6de7b513d62842f65d26148eb2793f44fa0bed598de34d27deb',
      'pixal3d_backend.py': 'ffe964bef59603b85f11f2e837016acb579ea28b737b9f0119be2ad58cc7cb78',
      'requirements.txt': '96dde7c35a0cdd3cd85dd925f345a73bad2e2fbd6821bbf1d4724413776b8d15',
    },
  },
  {
    model: 'pixal3d',
    target: { spaceId: 'TencentARC/Pixal3D', url: 'https://tencentarc-pixal3d.hf.space', revision: '40a1519aadf70a82110a500997c19b626668a144' },
    modelIds: ['TencentARC/Pixal3D', 'TencentARC/Pixal3D-T'], appFile: 'app.py', frontend: 'custom', requiredControls: [],
    customWorkflow: { imageInputId: 'file-input', generateControlId: 'generate-btn', downloadControlId: 'download-btn', generateApi: 'generate_3d', exportApi: 'extract_glb_api', exportSchema: 'file' },
    codeTreeDigest: 'fe798df9cd0894f998e35d6ad5a5506f461db1b5eecd0d3dddbcae18b652e881',
    sourceHashes: {
      'app.py': 'a9e2e72bfa8f8cd0d2cccd3a64f2a040241794a70eca2d3a2aea458502d08772',
      'requirements.txt': '160d9d3af2f93610d87c2500a977d9310e1b40564b21edef33e3f721c4964ca2',
    },
  },
  {
    model: 'trellis',
    target: { spaceId: 'microsoft/TRELLIS.2', url: 'https://microsoft-trellis-2.hf.space', revision: 'ebf60b20fc5a4607f90a1c11c0aab0ceeda5429d' },
    modelIds: ['microsoft/TRELLIS.2-4B'], appFile: 'app.py', frontend: 'gradio', requiredControls: ['Generate', 'Extract GLB'],
    codeTreeDigest: '1079033cbd7dfdd4a51a560530560fd9b83ce121f4c2d6cc8e3dc803b2699004',
    sourceHashes: {
      'app.py': '97edffac5d1c78992643551cc2d7daab6d9b3d7c0f049ddb5d9640ad11cfd4c3',
      'requirements.txt': 'f39775d7f4ae2081f73c3882cccbae0caeffb63c220f511f6a1a20fe20b91f38',
    },
  },
  {
    model: 'trellis',
    target: { spaceId: 'prithivMLmods/TRELLIS.2-Text-to-3D', url: 'https://prithivmlmods-trellis-2-text-to-3d.hf.space', revision: '1838678c08b59708c8f645350b4bbd748b0b60fb' },
    modelIds: ['microsoft/TRELLIS.2-4B'], appFile: 'app.py', frontend: 'gradio', requiredControls: ['2.Generate 3D'], requiredTab: 'Image-to-3D',
    codeTreeDigest: 'a4ced77a6b0cea036d7654175ce1e7829891d4af2dfa7b9a6a2ec708f5f47d74',
    sourceHashes: {
      'app.py': '2df97aa9917d10eb8f983ed7cec7df3bd99e246e75213f8f1a0106a530a26946',
      'requirements.txt': 'f4226f06501ce114e5cc43caebe2806fda082263121b28199b31e0724aead911',
    },
  },
  {
    model: 'hunyuan3d',
    target: { spaceId: 'tencent/Hunyuan3D-2.1', url: 'https://tencent-hunyuan3d-2-1.hf.space', revision: '61d23d8ce7d066d418ed501df7c3ee4329817f14' },
    modelIds: ['tencent/Hunyuan3D-2.1'], appFile: 'gradio_app.py', frontend: 'gradio', requiredControls: ['Gen Shape', 'Gen Textured Shape'],
    codeTreeDigest: 'e35c6754f7abe71c1bc464b2f4edede489156c3365f45dbd9d72f80e8628f4a6',
    sourceHashes: {
      'gradio_app.py': '9a4a3e2bb82c446b0d01107b7429b4b9981b8285d79d34511da87d86eecab4d1',
      'requirements.txt': '1fd3cb5428db32be184e21846f60230d8a27947bdcf485648ed1040817fe021d',
    },
  },
  {
    model: 'hunyuan3d',
    target: { spaceId: 'dylanebert/Hunyuan3D-2.1', url: 'https://dylanebert-hunyuan3d-2-1.hf.space', revision: '8ff1ca0ec79140ad6e89df3b183dad6775db666f' },
    modelIds: ['tencent/Hunyuan3D-2.1'], appFile: 'gradio_app.py', frontend: 'gradio', requiredControls: ['Gen Shape', 'Gen Textured Shape'],
    codeTreeDigest: '872b3dc45706175e03fa127068e3b6d4f04f9dd3232e03df97669e676684e6dd',
    sourceHashes: {
      'gradio_app.py': '207fa7ef316af74346c87267d492466c3e3601af267cc05ddba438e83eb39a8b',
      'requirements.txt': 'ece918da6a0bc7c3ab1156d40c7b33d35ac11c31de5f58b3f8de394f229aa696',
    },
  },
];

export const SPACE_DEFAULT_TARGETS: Record<SpaceModelId, SpaceTarget> = {
  pixal3d: { ...SPACE_IDENTITY_PROFILES[0].target },
  trellis: { ...SPACE_IDENTITY_PROFILES[2].target },
  hunyuan3d: { ...SPACE_IDENTITY_PROFILES[4].target },
};

export function isSpaceModelId(value: unknown): value is SpaceModelId {
  return typeof value === 'string' && SPACE_MODELS.some((model) => model === value);
}

export function workspaceUrl(model: SpaceModelId): string {
  return `/api/space-workspaces/${model}`;
}

export function isValidSpaceId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}\/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/.test(value);
}

// Used only as a validation boundary. The actual URL is always read from official HF metadata.
// Long names with opaque/hashed assigned hosts fail closed until explicitly reviewed.
export function expectedSpaceOrigin(spaceId: string): string | null {
  if (!isValidSpaceId(spaceId)) return null;
  const label = spaceId.toLowerCase().replace('/', '-').replace(/[_.]/g, '-');
  return label.length <= 63 ? `https://${label}.hf.space` : null;
}

export function isTrustedSpaceTarget(model: SpaceModelId, target: SpaceTarget): boolean {
  if (!isSpaceModelId(model) || !target || !isValidSpaceId(target.spaceId)) return false;
  if (target.revision !== undefined && !/^[a-f0-9]{40}$/.test(target.revision)) return false;
  const known = SPACE_IDENTITY_PROFILES.find((profile) => profile.model === model && profile.target.spaceId === target.spaceId);
  const origin = known?.target.url ?? expectedSpaceOrigin(target.spaceId);
  if (!origin || target.url !== origin) return false;
  if (known) return true;
  // This assertion comes only from server-side source verification and durable server state.
  return !!target.revision && SPACE_IDENTITY_PROFILES.some((profile) =>
    profile.model === model && profile.target.spaceId === target.verifiedProfile);
}
