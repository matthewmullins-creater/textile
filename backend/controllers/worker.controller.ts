import { Request, Response, NextFunction } from 'express';
import { prisma } from 'server';
import { parse } from 'csv-parse/sync';


interface UpdateWorkerData {
  role?: string;
  name?: string;
  cin?:string;
  phone?:string;
  email?:string
}

interface idParams {
  id: string;
}

interface WorkerCSVRow {
  name: string;
  cin: string;
  email?: string;
  phone?: string;
  role?: string;
  [key: string]: any;
}

export const getAllWorkers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workers = await prisma.worker.findMany({
      select: {
        id: true,
        name: true,
        cin:true,
        email:true,
        phone:true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
            performanceRecords: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json({ success: true, workers });
    return;
  } catch (error) {
    next(error);
  }
};

export const getWorkerById = async (
  req: Request<idParams>,
  res: Response,
  next: NextFunction
) => {
  try {
    const workerId = parseInt(req.params.id);

    if (isNaN(workerId)) {
      res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid worker ID provided',
      });
      return;
    }

    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        name: true,
        cin:true,
        email:true,
        phone:true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignments: true,
            performanceRecords: true,
          },
        },
        assignments: {
          include: {
            productionLine: true,
          },
          orderBy: { date: 'desc' },
          take: 20,
        },
        performanceRecords: {
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });
    

    if (!worker) {
      res.status(404).json({
        error: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
      return;
    }

    res.json({ success: true, worker });
    return;
  } catch (error) {
    next(error);
  }
};

export const createWorker = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name,role,cin,phone,email } = req.body;
    
    if (cin) {
      const cinExists = await prisma.worker.findUnique({
        where: { cin },
      });

      if (cinExists) {
        res.status(409).json({
          error: 'CIN_EXISTS',
          message: 'This CIN is already in use'
        });
        return;
      }
    }

    if (email) {
      const emailExists = await prisma.worker.findUnique({
        where: { email },
      });

      if (emailExists) {
        res.status(409).json({
          error: 'EMAIL_EXISTS',
          message: 'This email is already in use'
        });
        return;
      }
    }

    if (phone) {
      const phoneExists = await prisma.worker.findUnique({
        where: { phone },
      });

      if (phoneExists) {
        res.status(409).json({
          error: 'PHONE_EXISTS',
          message: 'This phone number is already in use'
        });
        return;
      }
    }

    const worker = await prisma.worker.create({
      data: {
        name,
        cin,
        phone,
        email,
        role,
      },
      select: {
        id: true,
        name: true,
        role: true,
        cin:true,
        email:true,
        phone:true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(201).json({
      success: true,
      message: 'Worker created successfully',
      worker,
    });
    return;
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (
  req: Request<{ id: string }, {}, UpdateWorkerData>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workerId = parseInt(req.params.id);
    if (isNaN(workerId)) {
      res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid worker ID provided',
      });
      return;
    }
    const { name, role,cin,phone,email } = req.body;
    const existingWorker = await prisma.worker.findUnique({
      where: {
        id: workerId,
      },
    });
    if (!existingWorker) {
      res.status(404).json({
        error: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
      return;
    }

    if (cin && cin !== existingWorker.cin) {
      const cinExists = await prisma.worker.findUnique({
        where: { cin },
      });

      if (cinExists) {
        res.status(409).json({
          error: 'CIN_EXISTS',
          message: 'This cin is already in use'
        });
        return;
      }
    }

    if (email && email !== existingWorker.email) {
      const emailExists = await prisma.worker.findUnique({
        where: { email },
      });

      if (emailExists) {
        res.status(409).json({
          error: 'EMAIL_EXISTS',
          message: 'This email is already in use'
        });
        return;
      }
    }

    if (phone && phone !== existingWorker.phone) {
      const phoneExists = await prisma.worker.findUnique({
        where: { phone },
      });

      if (phoneExists) {
        res.status(409).json({
          error: 'PHONE_EXISTS',
          message: 'This phone number is already in use'
        });
        return;
      }
    }


    const updatedData: any = {};
    if (name) updatedData.name = name;
    if (email !== undefined) updatedData.email = email || null;
    if (phone !== undefined) updatedData.phone = phone || null;
    if (cin) updatedData.cin = cin;
    if (role !== undefined) updatedData.role = role || null;

    const updatedWorker = await prisma.worker.update({
      where: { id: workerId },
      data: updatedData,
      select: {
        id: true,
        name: true,
        role: true,
        cin :true,
        email:true,
        phone:true,
        createdAt:true,
        updatedAt:true,
      },
    });
    res.json({
      success: true,
      message: 'worker updated successfully',
      worker: updatedWorker,
    });
    return;
  } catch (error) {
    next(error);
  }
};

export const deleteWorker = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workerId = parseInt(req.params.id);
    if (isNaN(workerId)) {
      res.status(400).json({
        error: 'INVALID_ID',
        message: 'Invalid worker ID provided',
      });
      return;
    }
    const existingWorker = await prisma.worker.findUnique({
      where: { id: workerId },
    });
    if (!existingWorker) {
      res.status(404).json({
        error: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
      return;
    }
    await prisma.worker.delete({
      where: { id: workerId },
    });

    res.json({
      success: true,
      message: 'Worker deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const importWorkers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: 'NO_FILE',
        message: 'No file uploaded',
      });
      return;
    }

    const csvData = req.file.buffer.toString('utf-8');
    
    // Parse CSV data
    let records: WorkerCSVRow[];
    try {
      records = parse(csvData, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as WorkerCSVRow[];
    } catch (parseError) {
      res.status(400).json({
        error: 'INVALID_CSV',
        message: 'Invalid CSV format',
      });
      return;
    }

    if (!records || records.length === 0) {
      res.status(400).json({
        error: 'EMPTY_CSV',
        message: 'CSV file is empty',
      });
      return;
    }

    // Validate required columns
    const requiredColumns = ['name', 'cin'];
    const firstRecord = records[0];
    if (!firstRecord) {
      res.status(400).json({
        error: 'EMPTY_CSV',
        message: 'CSV file is empty',
      });
      return;
    }
    const csvColumns = Object.keys(firstRecord);
    const missingColumns = requiredColumns.filter(col => !csvColumns.includes(col));
    if (missingColumns.length > 0) {
      res.status(400).json({
        error: 'MISSING_COLUMNS',
        message: `Missing required columns: ${missingColumns.join(', ')}`,
      });
      return;
    }

    const results = {
      success: [] as any[],
      errors: [] as any[],
      total: records.length,
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record) continue;
      const rowNumber = i + 2; // +2 because CSV row numbers start at 1 and we skip header

      try {
        // Validate required fields
        if (!record.name || !record.cin) {
          results.errors.push({
            row: rowNumber,
            data: record,
            error: 'Missing required fields (name, cin)',
          });
          continue;
        }

        // Check for existing CIN
        const existingCin = await prisma.worker.findUnique({
          where: { cin: record.cin },
        });

        if (existingCin) {
          results.errors.push({
            row: rowNumber,
            data: record,
            error: `CIN ${record.cin} already exists`,
          });
          continue;
        }

        // Check for existing email if provided
        if (record.email) {
          const existingEmail = await prisma.worker.findUnique({
            where: { email: record.email },
          });

          if (existingEmail) {
            results.errors.push({
              row: rowNumber,
              data: record,
              error: `Email ${record.email} already exists`,
            });
            continue;
          }
        }

        // Check for existing phone if provided
        if (record.phone) {
          const existingPhone = await prisma.worker.findUnique({
            where: { phone: record.phone },
          });

          if (existingPhone) {
            results.errors.push({
              row: rowNumber,
              data: record,
              error: `Phone ${record.phone} already exists`,
            });
            continue;
          }
        }

        // Create worker
        const worker = await prisma.worker.create({
          data: {
            name: record.name,
            cin: record.cin,
            email: record.email || null,
            phone: record.phone || null,
            role: record.role || null,
          },
          select: {
            id: true,
            name: true,
            cin: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        results.success.push({
          row: rowNumber,
          worker,
        });

      } catch (error) {
        results.errors.push({
          row: rowNumber,
          data: record,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      message: `Import completed. ${results.success.length} workers imported, ${results.errors.length} errors`,
      results,
    });

  } catch (error) {
    next(error);
  }
};