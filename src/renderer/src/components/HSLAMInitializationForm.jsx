import React, { useRef } from 'react'
import { useFormik } from 'formik'
import { TextInput, Checkbox, Button, Select, Container, Title, Grid, GridCol } from '@mantine/core'

import { object, string, boolean } from 'yup'

const HSLAMForm = () => {
  const calibFileRef = useRef(null)
  const gammaFileRef = useRef(null)
  const vignetteFileRef = useRef(null)
  const datasetFileRef = useRef(null)

  const validationSchema = object({
    workspaceDir: string().required('Workspace directory is required'),
    dataType: string().required('Data type is required'),
    calibFile: string().when('dataType', {
      is: 'camera',
      then: (schema) => schema.required('A camera calibration file is required')
    }),
    cameraPath: string().when('dataType', {
      is: 'camera',
      then: (schema) => schema.required('A camera path is required')
    }),
    datasetPath: string().when('dataType', {
      is: 'dataset',
      then: (schema) => schema.required('A dataset path is required'),
      otherwise: (schema) => schema.nullable()
    }),
    gammaFile: string().when('photometric', {
      is: true,
      then: (schema) => schema.required('Gamma file path is required'),
      otherwise: (schema) => schema.nullable()
    }),
    vignetteFile: string().when('photometric', {
      is: true,
      then: (schema) => schema.required('Vignette file path is required'),
      otherwise: (schema) => schema.nullable()
    }),
    photometric: boolean(),
    executionRealtime: boolean(),
    loopClosure: boolean(),
    fileLogging: boolean(),
    viewerGUI: boolean(),
    sequenceReversed: boolean()
  })

  const formik = useFormik({
    initialValues: {
      workspaceDir: null,
      buildType: null,
      dataType: null,
      calibFile: null,
      cameraPath: null,
      datasetPath: null,
      gammaFile: null,
      vignetteFile: null,
      photometric: true,
      executionRealtime: true,
      loopClosure: true,
      fileLogging: false,
      viewerGUI: true,
      sequenceReversed: false
    },
    validationSchema: validationSchema,
    validateOnMount: true,
    onSubmit: async (values) => {
      try {
        window.electron.ipcRenderer.send('open-rviz')
        const result = await window.electron.ipcRenderer.invoke('hslam-initialization', values)
        if (result) {
          const quitApplication = await window.electron.ipcRenderer.invoke(
            'quit-application',
            values
          )
        } else {
          alert('Oops, an error has occured!')
        }
      } catch (e) {
        alert('Oops, an error has occured! ' + e)
      }
    }
  })

  const handleFolderSelection = async (fieldName) => {
    const result = await window.electron.ipcRenderer.invoke('open-folder-dialog')
    if (result) {
      formik.setFieldValue(fieldName, result)
    }
  }

  return (
    <Container size="sm" style={{ marginTop: '40px' }}>
      <Title order={1}>Launch HSLAM</Title>

      <Grid className="form-grid-wrapper">
        <Grid.Col span={6}>
          <TextInput
            label="Workspace Directory"
            placeholder="Select Workspace Directory"
            onClick={() => {
              handleFolderSelection('workspaceDir')
            }}
            value={formik.values.workspaceDir}
            error={formik.touched.workspaceDir && formik.errors.workspaceDir}
            onBlur={formik.handleBlur('workspaceDir')}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <Select
            label="Data Type"
            placeholder="Select Data Type"
            error={formik.touched.dataType && formik.errors.dataType}
            data={[
              { value: 'camera', label: 'Live Camera Feed' },
              { value: 'dataset', label: 'Dataset' }
            ]}
            onChange={(value) => formik.setFieldValue('dataType', value)}
            value={formik.values.dataType}
            onBlur={formik.handleBlur('dataType')}
          />
        </Grid.Col>

        <Grid.Col span={6}>
          <TextInput
            label="Path of Camera Calibration File"
            error={formik.touched.calibFile && formik.errors.calibFile}
            placeholder="Select Camera Calibration File"
            value={formik.values.calibFile}
            onClick={() => {
              calibFileRef.current.click()
            }}
            onBlur={formik.handleBlur('calibFile')}
          />
          <input
            type="file"
            ref={calibFileRef}
            onChange={(e) => {
              formik.setFieldValue('calibFile', e?.target?.files[0].path)
            }}
            style={{ display: 'none' }}
          />
        </Grid.Col>
        {formik.values.dataType === 'dataset' ? (
          <Grid.Col span={6} />
        ) : (
          <Grid.Col span={6}>
            <TextInput
              label="Camera Path"
              placeholder="Camera Path"
              value={formik.values.cameraPath}
              error={formik.touched.cameraPath && formik.errors.cameraPath}
              onBlur={formik.handleBlur('cameraPath')}
              onChange={formik.handleChange('cameraPath')}
            />
          </Grid.Col>
        )}
        {formik.values.dataType === 'dataset' && (
          <>
            <Grid.Col span={6}>
              <TextInput
                label="Path of Dataset ZIP File"
                placeholder="Select Dataset ZIP File"
                error={formik.touched.datasetPath && formik.errors.datasetPath}
                value={formik.values.datasetPath}
                onClick={() => {
                  datasetFileRef.current.click()
                }}
                onBlur={formik.handleBlur('datasetPath')}
              />
              <input
                type="file"
                ref={datasetFileRef}
                onChange={(e) => {
                  formik.setFieldValue('datasetPath', e?.target?.files[0].path)
                }}
                style={{ display: 'none' }}
              />
            </Grid.Col>
            <Grid.Col span={3} className="form-checkbox">
              <Checkbox label="Execute Realtime" {...formik.getFieldProps('executionRealtime')} />
            </Grid.Col>
            <Grid.Col span={3} className="form-checkbox">
              <Checkbox label="Reverse Sequence" {...formik.getFieldProps('sequenceReversed')} />
            </Grid.Col>
          </>
        )}

        <Grid.Col span={12} className="form-checkbox">
          <Checkbox
            label="Enable Photometric Bundle Adjustment"
            checked={formik.values.photometric}
            {...formik.getFieldProps('photometric')}
          />
        </Grid.Col>
        {formik.values.photometric && (
          <>
            <Grid.Col span={6}>
              <TextInput
                label="Path of Gamma File"
                placeholder="Select Gamma File"
                error={formik.touched.gammaFile && formik.errors.gammaFile}
                value={formik.values.gammaFile}
                onClick={() => {
                  gammaFileRef.current.click()
                }}
                onBlur={formik.handleBlur('gammaFile')}
              />
              <input
                type="file"
                ref={gammaFileRef}
                onChange={(e) => {
                  formik.setFieldValue('gammaFile', e?.target?.files[0].path)
                }}
                style={{ display: 'none' }}
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <TextInput
                label="Vignette File Path"
                placeholder="Select Vignette File"
                error={formik.touched.vignetteFile && formik.errors.vignetteFile}
                value={formik.values.vignetteFile}
                onClick={() => {
                  vignetteFileRef.current.click()
                }}
                onBlur={formik.handleBlur('vignetteFile')}
              />
              <input
                type="file"
                ref={vignetteFileRef}
                onChange={(e) => {
                  formik.setFieldValue('vignetteFile', e?.target?.files[0].path)
                }}
                style={{ display: 'none' }}
              />
            </Grid.Col>
          </>
        )}

        <Grid.Col span={4} className="form-checkbox">
          <Checkbox
            label="Enable Loop Closure"
            checked={formik.values.loopClosure}
            {...formik.getFieldProps('loopClosure')}
          />
        </Grid.Col>
        <Grid.Col span={4} className="form-checkbox">
          <Checkbox
            label="Enable File Logging"
            checked={formik.values.fileLogging}
            {...formik.getFieldProps('fileLogging')}
          />
        </Grid.Col>
        <Grid.Col span={4} className="form-checkbox">
          <Checkbox
            label="Enable Viewer GUI"
            checked={formik.values.viewerGUI}
            {...formik.getFieldProps('viewerGUI')}
          />
        </Grid.Col>
      </Grid>
      <Button color="blue" onClick={formik.handleSubmit} disabled={!formik.isValid}>
        Submit
      </Button>
    </Container>
  )
}

export default HSLAMForm