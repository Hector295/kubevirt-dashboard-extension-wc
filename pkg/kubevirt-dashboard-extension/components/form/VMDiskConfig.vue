<script>
import { LabeledInput } from '@rancher/components';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import { get, set } from '@shell/utils/object';
import { mapGetters } from 'vuex';
import CodeMirror from '@shell/components/CodeMirror';

export default {
  name: 'VMDiskConfig',
  components: {
    LabeledInput,
    LabeledSelect,
    CodeMirror,
  },

  props: {
    value: {
      type: Object,
      required: true,
    },
    mode: {
      type: String,
      required: true,
    },
  },

  data() {
    return {
      busTypes: [
        { label: 'virtio', value: 'virtio' },
        { label: 'sata', value: 'sata' },
        { label: 'scsi', value: 'scsi' },
      ],
      volumeTypes: [
        { label: 'PVC', value: 'pvc' },
        { label: 'Container Disk', value: 'containerDisk' },
        { label: 'ConfigMap', value: 'configMap' },
        { label: 'Secret', value: 'secret' },
        { label: 'EmptyDir', value: 'emptyDir' },
        { label: 'Cloud-Init', value: 'cloudInit' },
      ],
      localDiskConfigs: [],
      loading: false,
    };
  },

  computed: {
    ...mapGetters(['currentCluster']),

    isView() {
      return this.mode === 'view';
    },

    disks: {
      get() {
        return get(this.value, 'spec.template.spec.domain.devices.disks') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.domain.devices.disks', newValue);
      },
    },

    volumes: {
      get() {
        return get(this.value, 'spec.template.spec.volumes') || [];
      },
      set(newValue) {
        set(this.value, 'spec.template.spec.volumes', newValue);
      },
    },

    namespace() {
      return this.value.metadata?.namespace || 'default';
    },

    // para tarer los recursos de whitecruiser
    pvcs() {
      try {
        const resources = this.$store.getters['cluster/all']('persistentvolumeclaim');
        return resources.filter((pvc) => pvc.metadata?.namespace === this.namespace);
      } catch (e) {
        console.error('Error getting PVCs:', e);
        return [];
      }
    },

    secrets() {
      try {
        const resources = this.$store.getters['cluster/all']('secret');
        return resources.filter((secret) => secret.metadata?.namespace === this.namespace);
      } catch (e) {
        console.error('Error getting Secrets:', e);
        return [];
      }
    },

    configMaps() {
      try {
        const resources = this.$store.getters['cluster/all']('configmap');
        return resources.filter((cm) => cm.metadata?.namespace === this.namespace);
      } catch (e) {
        console.error('Error getting ConfigMaps:', e);
        return [];
      }
    },

    pvcOptions() {
      const options = [{ label: 'Select existing PVC...', value: '' }];
      this.pvcs.forEach((pvc) => {
        options.push({
          label: pvc.metadata.name,
          value: pvc.metadata.name,
        });
      });
      return options;
    },

    secretOptions() {
      const options = [{ label: 'Select existing Secret...', value: '' }];
      this.secrets.forEach((secret) => {
        options.push({
          label: secret.metadata.name,
          value: secret.metadata.name,
        });
      });
      return options;
    },

    configMapOptions() {
      const options = [{ label: 'Select existing ConfigMap...', value: '' }];
      this.configMaps.forEach((cm) => {
        options.push({
          label: cm.metadata.name,
          value: cm.metadata.name,
        });
      });
      return options;
    },
  },

  watch: {
    namespace: {
      immediate: true,
      handler(newVal, oldVal) {
        if (newVal !== oldVal) {
          this.loadResources();
        }
      },
    },
  },

  async created() {
    await this.loadResources();
    this.loadDiskConfigs();

    if (this.localDiskConfigs.length === 0) {
      this.addDisk();
    }
  },

  methods: {
    async loadResources() {
      if (!this.namespace) return;

      this.loading = true;
      try {
        // Cargar recursos del namespace actual
        await Promise.all([
          this.$store.dispatch('cluster/findAll', {
            type: 'persistentvolumeclaim',
            opt: { namespace: this.namespace },
          }),
          this.$store.dispatch('cluster/findAll', {
            type: 'secret',
            opt: { namespace: this.namespace },
          }),
          this.$store.dispatch('cluster/findAll', {
            type: 'configmap',
            opt: { namespace: this.namespace },
          }),
        ]);
      } catch (e) {
        console.error('Error loading namespace resources:', e);
      } finally {
        this.loading = false;
      }
    },

    getVolumeType(volume) {
      if (volume.persistentVolumeClaim) return 'pvc';
      if (volume.containerDisk) return 'containerDisk';
      if (volume.configMap) return 'configMap';
      if (volume.secret) return 'secret';
      if (volume.emptyDir) return 'emptyDir';
      if (volume.cloudInitNoCloud) return 'cloudInit';
      return 'pvc';
    },

    loadDiskConfigs() {
      const disks = this.disks || [];
      const volumes = this.volumes || [];

      this.localDiskConfigs = disks.map((disk) => {
        const volume = volumes.find((v) => v.name === disk.name) || {};
        return {
          name: disk.name || '',
          bus: disk.disk?.bus || 'virtio',
          volumeType: this.getVolumeType(volume),
          pvcName: volume.persistentVolumeClaim?.claimName || '',
          containerImage: volume.containerDisk?.image || '',
          secretName: volume.secret?.secretName || '',
          configMapName: volume.configMap?.name || '',
          size: volume.emptyDir?.sizeLimit || '',
          userData: volume.cloudInitNoCloud?.userData || '',
        };
      });
    },

    syncToModel() {
      const disks = [];
      const volumes = [];

      this.localDiskConfigs.forEach((config) => {
        if (config.name) {
          const volume = { name: config.name };
          let hasValidSource = false;

          switch (config.volumeType) {
            case 'pvc':
              if (config.pvcName) {
                volume.persistentVolumeClaim = { claimName: config.pvcName };
                hasValidSource = true;
              }
              break;
            case 'containerDisk':
              if (config.containerImage) {
                volume.containerDisk = { image: config.containerImage };
                hasValidSource = true;
              }
              break;
            case 'secret':
              if (config.secretName) {
                volume.secret = { secretName: config.secretName };
                hasValidSource = true;
              }
              break;
            case 'configMap':
              if (config.configMapName) {
                volume.configMap = { name: config.configMapName };
                hasValidSource = true;
              }
              break;
            case 'emptyDir':
              volume.emptyDir = {};
              if (config.size && config.size.trim() !== '') {
                volume.emptyDir.sizeLimit = config.size.trim();
              }
              hasValidSource = true;
              break;
            case 'cloudInit':
              volume.cloudInitNoCloud = {
                userData: config.userData || '#cloud-config\n',
              };
              hasValidSource = true;
              break;
          }

          // Only add disk and volume if volume has a valid source
          if (hasValidSource) {
            disks.push({
              name: config.name,
              disk: {
                bus: config.bus || 'virtio',
              },
            });
            volumes.push(volume);
          }
        }
      });

      this.disks = disks;
      this.volumes = volumes;
    },

    updateDiskField(index, field, value) {
      if (this.localDiskConfigs[index]) {
        // Vue 3 - direct assignment works with reactivity
        this.localDiskConfigs[index][field] = value;

        // Resetear campos relacionados al cambiar tipo
        if (field === 'volumeType') {
          this.localDiskConfigs[index].pvcName = '';
          this.localDiskConfigs[index].containerImage = '';
          this.localDiskConfigs[index].secretName = '';
          this.localDiskConfigs[index].configMapName = '';
          this.localDiskConfigs[index].size = '';
          this.localDiskConfigs[index].userData = '';
        }

        this.syncToModel();
      }
    },

    addDisk() {
      const diskName = `disk${this.localDiskConfigs.length + 1}`;
      this.localDiskConfigs.push({
        name: diskName,
        bus: 'virtio',
        volumeType: 'pvc',
        pvcName: '',
        containerImage: '',
        secretName: '',
        configMapName: '',
        size: '',
        userData: '',
      });
      this.syncToModel();
    },

    removeDisk(index) {
      if (index < this.localDiskConfigs.length) {
        this.localDiskConfigs.splice(index, 1);
        this.syncToModel();
      }
    },

    refreshCodeMirror(index) {
      this.$nextTick(() => {
        setTimeout(() => {
          const ref = this.$refs[`cloudInitEditor${index}`];
          if (ref && ref.length) {
            ref[0].refresh();
          } else if (ref && ref.refresh) {
            ref.refresh();
          }
        }, 100);
      });
    },
  },
};
</script>

<template>
  <div>
    <div class="row mb-20">
      <div class="col span-12">
        <h3>Disks & Volumes</h3>
        <p class="text-muted">Configure storage volumes for the virtual machine</p>
      </div>
    </div>

    <div v-if="loading" class="text-center">Loading resources...</div>

    <div v-for="(disk, index) in localDiskConfigs" :key="`disk-${index}`" class="disk-config mb-20">
      <div class="row mb-10">
        <div class="col span-12">
          <h4>Disk {{ index + 1 }}</h4>
        </div>
      </div>

      <div class="row mb-10">
        <div class="col span-4">
          <LabeledInput
            :value="localDiskConfigs[index].name"
            :mode="mode"
            label="Disk Name"
            placeholder="rootdisk"
            @input="(val) => updateDiskField(index, 'name', val)"
          />
        </div>

        <div class="col span-4">
          <LabeledSelect
            v-model:value="disk.bus"
            :mode="mode"
            :options="busTypes"
            label="Disk Bus"
            :reduce="(e) => e.value"
            @update:value="(val) => updateDiskField(index, 'bus', val)"
          />
        </div>

        <div class="col span-4">
          <LabeledSelect
            :mode="mode"
            :options="volumeTypes"
            label="Volume Type"
            v-model:value="disk.volumeType"
            :reduce="(e) => e.value"
            @update:value="(val) => updateDiskField(index, 'volumeType', val)"
          />
        </div>
      </div>

      <div v-if="disk.volumeType === 'pvc'" class="row mb-10">
        <div class="col span-12">
          <LabeledSelect
            :mode="mode"
            :options="pvcOptions"
            label="PVC"
            v-model:value="disk.pvcName"
            :reduce="(e) => e.value"
            @update:value="(val) => updateDiskField(index, 'pvcName', val)"
          />
          <div v-if="disk.pvcName" class="mt-5">
            Selected PVC: <strong>{{ disk.pvcName }}</strong>
          </div>
        </div>
      </div>

      <div v-if="disk.volumeType === 'containerDisk'" class="row mb-10">
        <div class="col span-12">
          <LabeledInput
            :mode="mode"
            v-model:value="localDiskConfigs[index].containerImage"
            label="Container Image"
            placeholder="kubevirt/fedora-cloud-container-disk-demo:latest"
            @input="(val) => updateDiskField(index, 'containerImage', val)"
          />
        </div>
      </div>

      <div v-if="disk.volumeType === 'secret'" class="row mb-10">
        <div class="col span-12">
          <LabeledSelect
            :mode="mode"
            :options="secretOptions"
            label="Secret"
            v-model:value="disk.secretName"
            :reduce="(e) => e.value"
            @update:value="(val) => updateDiskField(index, 'secretName', val)"
          />
          <div v-if="disk.secretName" class="mt-5">
            Selected Secret: <strong>{{ disk.secretName }}</strong>
          </div>
        </div>
      </div>

      <div v-if="disk.volumeType === 'configMap'" class="row mb-10">
        <div class="col span-12">
          <LabeledSelect
            :mode="mode"
            :options="configMapOptions"
            label="ConfigMap"
            v-model:value="disk.configMapName"
            :reduce="(e) => e.value"
            @update:value="(val) => updateDiskField(index, 'configMapName', val)"
          />
          <div v-if="disk.configMapName" class="mt-5">
            Selected ConfigMap: <strong>{{ disk.configMapName }}</strong>
          </div>
        </div>
      </div>

      <div v-if="disk.volumeType === 'emptyDir'" class="row mb-10">
        <div class="col span-6">
          <LabeledInput
            v-model:value="localDiskConfigs[index].size"
            :mode="mode"
            label="Size"
            placeholder="10Gi"
            @input="(val) => updateDiskField(index, 'size', val)"
          />
        </div>
      </div>

      <div v-if="disk.volumeType === 'cloudInit'" class="row mb-10">
        <div class="col span-12">
          <label class="text-label">Cloud-Init Configuration</label>
          <div class="cloud-init-editor">
            <CodeMirror
              :ref="`cloudInitEditor${index}`"
              :value="localDiskConfigs[index].userData || '#cloud-config\n'"
              :mode="mode"
              :show-key-map-box="true"
              :options="{
                mode: 'yaml',
                lint: true,
                lineNumbers: true,
                lineWrapping: true,
                tabSize: 2,
                indentWithTabs: false,
                viewportMargin: Infinity
              }"
              @onInput="(val) => updateDiskField(index, 'userData', val)"
              @onReady="() => refreshCodeMirror(index)"
            />
          </div>
        </div>
      </div>

      <div class="row mb-10">
        <div class="col span-12">
          <button
            v-if="!isView"
            type="button"
            class="btn btn-sm role-link"
            @click="removeDisk(index)"
          >
            Remove Disk
          </button>
        </div>
      </div>

      <hr v-if="index < localDiskConfigs.length - 1" class="section-divider" />
    </div>

    <div class="row">
      <div class="col span-12">
        <button v-if="!isView" type="button" class="btn btn-sm role-tertiary" @click="addDisk">
          Add Disk
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
h3,
h4 {
  margin-bottom: 10px;
}

.text-muted {
  color: var(--muted);
  font-size: 0.9em;
  margin-bottom: 15px;
}

.disk-config {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 15px;
  background-color: var(--box-bg);
}

.section-divider {
  margin: 20px 0;
  border: none;
  border-top: 1px solid var(--border);
}

.mt-5 {
  margin-top: 5px;
}

.text-label {
  display: block;
  color: var(--input-label);
  font-size: 14px;
  font-weight: normal;
  margin-bottom: 5px;
}

.cloud-init-editor {
  margin-top: 5px;
}

.cloud-init-editor ::v-deep .CodeMirror {
  height: auto !important;
}

.cloud-init-editor ::v-deep .CodeMirror-scroll {
  max-height: none !important;
  overflow-y: visible !important;
}

.cloud-init-editor ::v-deep .CodeMirror-sizer {
  min-height: auto !important;
}
</style>
